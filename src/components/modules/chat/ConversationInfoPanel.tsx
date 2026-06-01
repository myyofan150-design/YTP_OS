"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserPlus, Loader2, Pin, Archive, Search, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConversation } from "@/hooks/useChat";
import type { ApiResponse, ChatMessage, ChatMessageAttachment } from "@/types";

interface UserResult {
  id: number;
  uuid: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

import { resolveAssetUrl } from "@/lib/utils";

interface Props {
  conversationUuid: string;
  currentUserRole:  string;
  onClose:          () => void;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export function ConversationInfoPanel({ conversationUuid, currentUserRole, onClose }: Props) {
  const { conversation, refetch } = useConversation(conversationUuid);
  const [pinnedMsgs,       setPinnedMsgs]       = useState<ChatMessage[]>([]);
  const [sharedFiles,      setSharedFiles]      = useState<ChatMessageAttachment[]>([]);
  const [addMemberSearch,  setAddMemberSearch]  = useState("");
  const [addMemberResults, setAddMemberResults] = useState<UserResult[]>([]);
  const [searchingUsers,   setSearchingUsers]   = useState(false);
  const [addingMember,     setAddingMember]     = useState(false);
  const [showAddMember,    setShowAddMember]    = useState(false);
  const [filesExpanded,    setFilesExpanded]    = useState(false);
  const [pinsExpanded,     setPinsExpanded]     = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = ADMIN_ROLES.includes(currentUserRole);

  useEffect(() => {
    api.get<ApiResponse<ChatMessage[]>>(`/chat/conversations/${conversationUuid}/pins`)
      .then(r => setPinnedMsgs(r.data.data ?? []))
      .catch(() => {});
    api.get<ApiResponse<{ attachments: ChatMessageAttachment[] }>>(`/chat/search/files`, {
      params: { conversationUuid },
    })
      .then(r => setSharedFiles((r.data.data as unknown as ChatMessageAttachment[]) ?? []))
      .catch(() => {});
  }, [conversationUuid]);

  async function handleArchive() {
    if (!confirm("Archive this conversation?")) return;
    try {
      await api.patch(`/chat/conversations/${conversationUuid}/archive`);
      toast.success("Conversation archived");
      onClose();
    } catch { toast.error("Failed to archive"); }
  }

  // Debounced user search for add-member
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!addMemberSearch.trim()) { setAddMemberResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const existing = new Set(conversation?.members?.map(m => m.userId) ?? []);
        const r = await api.get<ApiResponse<UserResult[]>>("/users", {
          params: { search: addMemberSearch, limit: 8 },
        });
        setAddMemberResults((r.data.data ?? []).filter(u => !existing.has(u.id)));
      } catch {
        // non-fatal
      } finally {
        setSearchingUsers(false);
      }
    }, 300);
  }, [addMemberSearch, conversation?.members]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddMember(u: UserResult) {
    setAddingMember(true);
    try {
      await api.post(`/chat/conversations/${conversationUuid}/members`, { userUuid: u.uuid });
      toast.success(`${u.name} added to group`);
      setAddMemberSearch("");
      setAddMemberResults([]);
      setShowAddMember(false);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleUnpin(msgUuid: string) {
    try {
      await api.delete(`/chat/conversations/${conversationUuid}/messages/${msgUuid}/pin`);
      setPinnedMsgs(prev => prev.filter(m => m.uuid !== msgUuid));
    } catch { toast.error("Failed to unpin"); }
  }

  const conv = conversation;
  const isGroup  = conv?.type !== "direct";
  const imgFiles = sharedFiles.filter(f => f.fileType?.startsWith("image/"));
  const docFiles = sharedFiles.filter(f => !f.fileType?.startsWith("image/"));

  return (
    <div
      className="absolute inset-y-0 right-0 flex flex-col z-30 animate-slide-up"
      style={{
        width: 320,
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Conversation Info
        </span>
        <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md" style={{ color: "var(--text-secondary)" }}>
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!conv ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
          </div>
        ) : (
          <>
            {/* Conversation / User info */}
            <div className="px-4 py-4 flex flex-col items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: `hsl(${(conv.name ?? "?").charCodeAt(0) % 360},55%,40%)` }}
              >
                {(conv.name ?? conv.otherUser?.name ?? "?")[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-center" style={{ color: "var(--text-primary)" }}>
                {conv.name ?? conv.otherUser?.name ?? "Unknown"}
              </p>
              {!isGroup && conv.otherUser && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Direct message</p>
              )}
              {isGroup && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {conv.members?.length ?? 0} members
                </p>
              )}
            </div>

            {/* Members (group) */}
            {isGroup && conv.members && (
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                    Members
                  </span>
                  {isAdmin && (
                    <button
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: "#03ff94" }}
                      onClick={() => { setShowAddMember(v => !v); setAddMemberSearch(""); setAddMemberResults([]); }}
                    >
                      <UserPlus size={12} />
                      {showAddMember ? "Cancel" : "Add"}
                    </button>
                  )}
                </div>

                {/* Add member search (inline, shown when showAddMember=true) */}
                {showAddMember && (
                  <div className="mb-2 relative">
                    <div
                      className="flex items-center gap-2 px-2 h-8 rounded-lg"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                    >
                      <Search size={12} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search people to add…"
                        value={addMemberSearch}
                        onChange={e => setAddMemberSearch(e.target.value)}
                        className="flex-1 bg-transparent text-xs outline-none"
                        style={{ color: "var(--text-primary)" }}
                      />
                      {searchingUsers && <Loader2 size={11} className="animate-spin shrink-0" style={{ color: "var(--text-secondary)" }} />}
                    </div>

                    {/* Results dropdown */}
                    {addMemberResults.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg overflow-hidden"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
                      >
                        {addMemberResults.map(u => (
                          <button
                            key={u.uuid}
                            onClick={() => handleAddMember(u)}
                            disabled={addingMember}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors disabled:opacity-50"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <div
                              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: `hsl(${u.name.charCodeAt(0) % 360},55%,40%)` }}
                            >
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{u.role.replace(/_/g, " ")}</p>
                            </div>
                            {addingMember
                              ? <Loader2 size={11} className="animate-spin shrink-0" style={{ color: "var(--text-secondary)" }} />
                              : <UserPlus size={11} style={{ color: "#03ff94", flexShrink: 0 }} />
                            }
                          </button>
                        ))}
                      </div>
                    )}

                    {addMemberSearch.trim() && !searchingUsers && addMemberResults.length === 0 && (
                      <p className="text-[11px] mt-1 px-1" style={{ color: "var(--text-secondary)" }}>
                        No users found (already members are excluded)
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  {conv.members.map(m => (
                    <div key={m.userId} className="flex items-center gap-2 py-1">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: `hsl(${(m.name ?? "?").charCodeAt(0) % 360},55%,40%)` }}
                      >
                        {(m.name ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{m.role?.replace(/_/g, " ")}</p>
                      </div>
                      {m.memberRole === "admin" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(3,255,148,0.12)", color: "#03ff94" }}>
                          admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Announcement only toggle (admin + group) */}
            {isGroup && isAdmin && (
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Announcement Only</p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Only admins can post</p>
                  </div>
                  <div
                    className="relative h-5 w-9 rounded-full transition-colors"
                    style={{
                      background: conv.isAnnouncementOnly ? "#03ff94" : "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                    }}
                    onClick={async () => {
                      try {
                        await api.patch(`/chat/conversations/${conversationUuid}`, {
                          isAnnouncementOnly: !conv.isAnnouncementOnly,
                        });
                        refetch();
                      } catch { toast.error("Failed to update"); }
                    }}
                  >
                    <span
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                      style={{ left: conv.isAnnouncementOnly ? "calc(100% - 18px)" : "2px" }}
                    />
                  </div>
                </label>
              </div>
            )}

            {/* Pinned messages */}
            {pinnedMsgs.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => setPinsExpanded(v => !v)}
                >
                  <span className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                    Pinned ({pinnedMsgs.length})
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{pinsExpanded ? "▲" : "▼"}</span>
                </button>
                {pinsExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {pinnedMsgs.map(m => (
                      <div
                        key={m.uuid}
                        className="flex items-start gap-2 p-2 rounded-lg"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <Pin size={11} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                        <p className="text-xs flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                          {m.content}
                        </p>
                        {isAdmin && (
                          <button onClick={() => handleUnpin(m.uuid)} className="shrink-0">
                            <X size={11} style={{ color: "var(--text-secondary)" }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Shared files */}
            {sharedFiles.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => setFilesExpanded(v => !v)}
                >
                  <span className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                    Shared Files ({sharedFiles.length})
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{filesExpanded ? "▲" : "▼"}</span>
                </button>
                {filesExpanded && (
                  <div className="mt-2 space-y-2">
                    {imgFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-1">
                        {imgFiles.map(f => (
                          <img
                            key={f.uuid}
                            src={resolveAssetUrl(f.filePath) ?? f.filePath}
                            alt={f.fileName}
                            className="rounded aspect-square object-cover cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                    {docFiles.map(f => (
                      <div
                        key={f.uuid}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <span className="text-base shrink-0">📎</span>
                        <span className="text-xs truncate flex-1" style={{ color: "var(--text-primary)" }}>{f.fileName}</span>
                        <a
                          href={resolveAssetUrl(f.filePath) ?? f.filePath}
                          download={f.fileName}
                          className="text-xs shrink-0"
                          style={{ color: "#03ff94" }}
                        >
                          ↓
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            {isAdmin && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase mb-2" style={{ letterSpacing: "0.06em", color: "#ef4444" }}>Danger</p>
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <Archive size={13} />
                  Archive Conversation
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
