"use client";

import { useState, useMemo, useEffect } from "react";
import { PenSquare, Users, Search } from "lucide-react";
import { useConversations } from "@/hooks/useChat";
import { useChatSocket }    from "@/hooks/useChatSocket";
import { ConversationItem } from "./ConversationItem";
import type { ChatConversation } from "@/types";

type Tab = "all" | "direct" | "group" | "contextual";

interface Props {
  activeUuid:   string | null;
  onSelect:     (uuid: string) => void;
  onNewDirect:  () => void;
  onNewGroup:   () => void;
  userRole:     string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export function ConversationListPanel({ activeUuid, onSelect, onNewDirect, onNewGroup, userRole }: Props) {
  const { conversations, isLoading, refetch } = useConversations();
  const { onlineUsers, onEvent }              = useChatSocket();
  const [search, setSearch]   = useState("");
  const [tab, setTab]         = useState<Tab>("all");

  // Refresh list when server tells us a new conversation was created/joined
  useEffect(() => {
    const off = onEvent("conversation:refresh", refetch);
    return () => { off(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list: ChatConversation[] = conversations;
    if (tab !== "all") list = list.filter(c => c.type === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = (c.name ?? c.otherUser?.name ?? "").toLowerCase();
        const preview = (c.lastMessagePreview ?? "").toLowerCase();
        return name.includes(q) || preview.includes(q);
      });
    }
    return list;
  }, [conversations, tab, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Messages
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewDirect}
            title="New direct message"
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <PenSquare size={16} />
          </button>
          {ADMIN_ROLES.includes(userRole) && (
            <button
              onClick={onNewGroup}
              title="New group"
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Users size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <div
          className="flex items-center gap-2 px-3 rounded-lg h-8"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <Search size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0.5 px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["all", "direct", "group", "contextual"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all"
            style={tab === t
              ? { background: "rgba(3,255,148,0.15)", color: "#03ff94" }
              : { color: "var(--text-secondary)" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#03ff94" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-2xl">💬</span>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {search ? "No matches" : "No conversations yet"}
            </p>
            {!search && (
              <button
                onClick={onNewDirect}
                className="text-xs font-medium mt-1 transition-opacity hover:opacity-70"
                style={{ color: "#03ff94" }}
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          filtered.map(conv => {
            const otherId = conv.otherUser?.id;
            const isOnline = typeof otherId === "number" && onlineUsers.has(otherId);
            return (
              <ConversationItem
                key={conv.uuid}
                conversation={conv}
                isActive={conv.uuid === activeUuid}
                isOnline={isOnline}
                onClick={() => { onSelect(conv.uuid); refetch(); }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
