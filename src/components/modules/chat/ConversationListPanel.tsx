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
        style={{ borderBottom: "1px solid #e9edef", background: "#ffffff" }}
      >
        <h2 className="text-[16px] font-semibold" style={{ color: "#111827" }}>
          Messages
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewDirect}
            title="New direct message"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ color: "#54656f" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#111827"; (e.currentTarget as HTMLElement).style.background = "#f0f2f5"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#54656f"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <PenSquare size={17} />
          </button>
          {ADMIN_ROLES.includes(userRole) && (
            <button
              onClick={onNewGroup}
              title="New group"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ color: "#54656f" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#111827"; (e.currentTarget as HTMLElement).style.background = "#f0f2f5"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#54656f"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Users size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-2 shrink-0" style={{ background: "#ffffff" }}>
        <div
          className="flex items-center gap-2 px-3 rounded-full h-9"
          style={{ background: "#f0f2f5" }}
        >
          <Search size={14} style={{ color: "#8696a0", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search or Start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#111827" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex px-3 pb-1 shrink-0"
        style={{ borderBottom: "1px solid #e9edef", background: "#ffffff" }}
      >
        {([
          { key: "all",    label: "All messages" },
          { key: "direct", label: "Direct" },
          { key: "group",  label: "Group" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-1.5 text-[13px] font-medium transition-all relative"
            style={{ color: tab === key ? "#00BFA5" : "#667781" }}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#00BFA5" }} />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1" style={{ background: "#ffffff" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#00BFA5" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-2xl">💬</span>
            <p className="text-sm" style={{ color: "#667781" }}>
              {search ? "No matches found" : "No conversations yet"}
            </p>
            {!search && (
              <button
                onClick={onNewDirect}
                className="text-sm font-medium mt-1 transition-opacity hover:opacity-70"
                style={{ color: "#00BFA5" }}
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
