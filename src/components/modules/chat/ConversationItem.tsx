"use client";

import { BellOff } from "lucide-react";
import type { ChatConversation } from "@/types";

interface Props {
  conversation: ChatConversation;
  isActive: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

function formatChatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d   = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "now";
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-semibold text-white text-sm"
      style={{ width: size, height: size, background: `hsl(${hue},55%,40%)` }}
    >
      {initials}
    </div>
  );
}

export function ConversationItem({ conversation: c, isActive, isOnline, onClick }: Props) {
  const displayName = c.name ?? c.otherUser?.name ?? "Unknown";
  const avatar      = c.avatarUrl ?? c.otherUser?.avatarUrl;
  const unread      = c.unreadCount ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-100 text-left"
      style={{
        background: isActive ? "rgba(3,255,148,0.10)" : "transparent",
        minHeight: 64,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {avatar ? (
          <img
            src={`${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api$/, "")}/${avatar}`}
            alt={displayName}
            className="rounded-full object-cover"
            style={{ width: 44, height: 44 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <InitialsAvatar name={displayName} size={44} />
        )}
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "var(--bg-surface)" }}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: isActive ? "#03ff94" : "var(--text-primary)" }}
            >
              {displayName}
            </span>
            {c.isMuted && (
              <BellOff size={11} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            )}
          </div>
          <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>
            {formatChatTime(c.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span
            className="text-xs truncate flex-1"
            style={{
              color: unread > 0 ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: unread > 0 ? 500 : 400,
            }}
          >
            {c.lastMessagePreview ?? "No messages yet"}
          </span>
          {unread > 0 && (
            <span
              className="shrink-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "#ef4444" }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
