"use client";

import { BellOff } from "lucide-react";
import type { ChatConversation } from "@/types";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api$/, "");

interface Props {
  conversation: ChatConversation;
  isActive:     boolean;
  isOnline?:    boolean;
  onClick:      () => void;
}

function formatChatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "now";
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  if (days < 7)   return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function InitialsAvatar({ name, size = 46 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue},55%,42%)`, fontSize: 15 }}
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
      className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-100 text-left relative"
      style={{
        background:  isActive ? "#f0f2f5" : "transparent",
        borderLeft:  isActive ? "3px solid #00BFA5" : "3px solid transparent",
        paddingLeft: isActive ? "13px" : "16px",
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f5f6f6"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {avatar ? (
          <img
            src={`${API_ROOT}/${avatar}`}
            alt={displayName}
            className="rounded-full object-cover"
            style={{ width: 46, height: 46 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <InitialsAvatar name={displayName} size={46} />
        )}
        {isOnline && (
          <span
            className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2"
            style={{ background: "#25d366", borderColor: "#ffffff" }}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0" style={{ borderBottom: "1px solid #f0f2f5" }}>
        <div className="flex items-center justify-between gap-1 pb-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[15px] font-semibold truncate" style={{ color: "#111827" }}>
              {displayName}
            </span>
            {c.isMuted && (
              <BellOff size={12} style={{ color: "#8696a0", flexShrink: 0 }} />
            )}
          </div>
          <span
            className="text-[12px] shrink-0"
            style={{ color: unread > 0 ? "#00BFA5" : "#8696a0" }}
          >
            {formatChatTime(c.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <span
            className="text-[13px] truncate flex-1"
            style={{
              color:      unread > 0 ? "#111827" : "#667781",
              fontWeight: unread > 0 ? 500 : 400,
            }}
          >
            {c.lastMessagePreview ?? "No messages yet"}
          </span>
          {unread > 0 && (
            <span
              className="shrink-0 flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
              style={{ background: "#00BFA5" }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
