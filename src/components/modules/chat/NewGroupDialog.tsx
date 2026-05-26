"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

interface UserResult {
  id: number;
  uuid: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface Props {
  onClose:   () => void;
  onCreated: (uuid: string) => void;
}

export function NewGroupDialog({ onClose, onCreated }: Props) {
  const [groupName,       setGroupName]       = useState("");
  const [description,     setDescription]     = useState("");
  const [announcementOnly, setAnnouncementOnly] = useState(false);
  const [search,          setSearch]          = useState("");
  const [results,         setResults]         = useState<UserResult[]>([]);
  const [selected,        setSelected]        = useState<UserResult[]>([]);
  const [loadingSearch,   setLoadingSearch]   = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!search.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const r = await api.get<ApiResponse<UserResult[]>>("/users", { params: { search, limit: 10 } });
        setResults((r.data.data ?? []).filter(u => !selected.some(s => s.uuid === u.uuid)));
      } catch {
        // non-fatal
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
  }, [search, selected]);

  function addMember(u: UserResult) {
    setSelected(prev => prev.some(s => s.uuid === u.uuid) ? prev : [...prev, u]);
    setSearch("");
    setResults([]);
  }

  function removeMember(uuid: string) {
    setSelected(prev => prev.filter(s => s.uuid !== uuid));
  }

  async function handleSubmit() {
    if (!groupName.trim()) { toast.error("Group name is required"); return; }
    setSubmitting(true);
    try {
      const r = await api.post("/chat/conversations/group", {
        name:               groupName.trim(),
        description:        description.trim() || undefined,
        memberUserUuids:    selected.map(s => s.uuid),
        isAnnouncementOnly: announcementOnly,
      });
      onCreated(r.data.data.uuid);
      onClose();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl overflow-hidden animate-slide-up"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "#03ff94" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New Group</span>
          </div>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md" style={{ color: "var(--text-secondary)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Group name */}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="mt-1 w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Member search */}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Add Members</label>
            <div className="relative mt-1">
              <div
                className="flex items-center gap-2 px-3 h-9 rounded-lg"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <Search size={13} style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                {loadingSearch && <Loader2 size={13} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
              </div>
              {results.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg overflow-hidden"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
                >
                  {results.map(u => (
                    <button
                      key={u.uuid}
                      onClick={() => addMember(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: `hsl(${u.name.charCodeAt(0) % 360},55%,40%)` }}
                      >
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 truncate">{u.name}</span>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>{u.role.replace(/_/g, " ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selected.map(u => (
                  <span
                    key={u.uuid}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(3,255,148,0.12)", color: "#03ff94", border: "1px solid rgba(3,255,148,0.25)" }}
                  >
                    {u.name}
                    <button onClick={() => removeMember(u.uuid)} className="flex items-center">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Announcement only toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Announcement Only</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Only admins can post</p>
            </div>
            <div
              onClick={() => setAnnouncementOnly(v => !v)}
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{ background: announcementOnly ? "#03ff94" : "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                style={{ left: announcementOnly ? "calc(100% - 18px)" : "2px" }}
              />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !groupName.trim()}
            className="h-8 px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-50"
            style={{ background: "#03ff94", color: "#000" }}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
