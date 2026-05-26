"use client";

import { useState } from "react";
import { Reply, Pin, Pencil, Trash2, Download, Eye, Play } from "lucide-react";
import type { ChatMessage } from "@/types";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api$/, "");

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "✅"];

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeIcon(mime: string): string {
  if (mime.startsWith("image/"))   return "🖼️";
  if (mime.startsWith("video/"))   return "🎬";
  if (mime.includes("pdf"))        return "📄";
  if (mime.includes("wordprocessingml")) return "📝";
  if (mime.includes("spreadsheetml"))    return "📊";
  if (mime.includes("zip"))        return "📦";
  return "📎";
}

function timeStr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface Props {
  message:           ChatMessage;
  isOwn:             boolean;
  isGroup:           boolean;
  onReply:           (msg: ChatMessage) => void;
  onReact:           (msgUuid: string, emoji: string) => void;
  onPin:             (msgUuid: string, isPinned: boolean) => void;
  onEdit:            (msg: ChatMessage) => void;
  onDelete:          (msgUuid: string) => void;
  currentUserId:     number;
  currentUserRole:   string;
  conversationUuid:  string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export function MessageBubble({
  message: msg, isOwn, isGroup, onReply, onReact, onPin, onEdit, onDelete,
  currentUserRole,
}: Props) {
  const [hovered,         setHovered]         = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [expandImg,       setExpandImg]       = useState<string | null>(null);
  const [mediaLoaded,     setMediaLoaded]     = useState(false);

  const canDelete = isOwn || ADMIN_ROLES.includes(currentUserRole);
  const isAdmin   = ADMIN_ROLES.includes(currentUserRole);

  // System message
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs italic px-3 py-1 rounded-full" style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)" }}>
          {msg.content}
        </span>
      </div>
    );
  }

  const bubbleBg   = isOwn ? "#4f46e5" : "var(--bg-surface)";
  const textColor  = isOwn ? "#fff"     : "var(--text-primary)";
  const borderStyle = isOwn ? "none" : `1px solid var(--border)`;

  return (
    <div
      className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiPickerOpen(false); }}
    >
      {/* Avatar (others only) */}
      {!isOwn && isGroup && (
        <div className="shrink-0 mr-2 mt-1">
          {msg.sender?.avatarUrl ? (
            <img
              src={`${API_ROOT}/${msg.sender.avatarUrl}`}
              alt={msg.sender.name}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: `hsl(${(msg.sender?.name ?? "").charCodeAt(0) % 360},55%,40%)` }}
            >
              {msg.sender?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name (group, others) */}
        {!isOwn && isGroup && (
          <span className="text-[11px] font-semibold mb-0.5 ml-1" style={{ color: "#03ff94" }}>
            {msg.sender?.name ?? ""}
          </span>
        )}

        {/* Hover actions */}
        {hovered && !msg.isDeleted && (
          <div
            className={`flex items-center gap-0.5 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Emoji picker trigger */}
            <div className="relative">
              <button
                onClick={() => setEmojiPickerOpen(v => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-sm transition-colors"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                title="React"
              >
                😊
              </button>
              {emojiPickerOpen && (
                <div
                  className={`absolute z-20 flex flex-wrap gap-1 p-2 rounded-lg ${isOwn ? "right-0" : "left-0"}`}
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", width: 136, bottom: "calc(100% + 4px)" }}
                >
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { onReact(msg.uuid, emoji); setEmojiPickerOpen(false); }}
                      className="text-base transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ActionBtn icon={<Reply size={12} />}  title="Reply"  onClick={() => onReply(msg)} />
            {isAdmin && (
              <ActionBtn icon={<Pin size={12} />} title={msg.isPinned ? "Unpin" : "Pin"} onClick={() => onPin(msg.uuid, msg.isPinned)} />
            )}
            {isOwn && (
              <ActionBtn icon={<Pencil size={12} />} title="Edit" onClick={() => onEdit(msg)} />
            )}
            {canDelete && (
              <ActionBtn icon={<Trash2 size={12} />} title="Delete" onClick={() => onDelete(msg.uuid)} danger />
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className="relative rounded-2xl px-3 py-2 text-sm"
          style={{ background: bubbleBg, border: borderStyle, color: textColor, minWidth: 48 }}
        >
          {/* Reply quote */}
          {msg.replyTo && (
            <div
              className="mb-1.5 px-2 py-1 rounded-lg text-xs border-l-2"
              style={{
                background: isOwn ? "rgba(255,255,255,0.1)" : "var(--bg-elevated)",
                borderLeftColor: "#03ff94",
                color: isOwn ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
              }}
            >
              <span className="font-semibold" style={{ color: isOwn ? "#9dffcc" : "#03ff94" }}>
                {msg.replyTo.sender?.name ?? "Unknown"}
              </span>
              <p className="truncate">{msg.replyTo.isDeleted ? "This message was deleted" : msg.replyTo.content}</p>
            </div>
          )}

          {/* Deleted */}
          {msg.isDeleted ? (
            <span className="italic" style={{ color: isOwn ? "rgba(255,255,255,0.5)" : "var(--text-secondary)" }}>
              This message was deleted
            </span>

          ) : msg.type === "image" && msg.attachments?.[0] ? (
            /* ── Image: placeholder until user taps View ── */
            (() => {
              const att    = msg.attachments![0]!;
              const src    = `${API_ROOT}/${att.filePath}`;
              const dlHref = `/api/chat/attachments/${att.uuid}/download`;
              if (!mediaLoaded) {
                return (
                  <MediaPlaceholder
                    icon="🖼️"
                    label={att.fileName}
                    size={att.fileSize}
                    isOwn={isOwn}
                    dlHref={dlHref}
                    dlName={att.fileName}
                    onView={() => setMediaLoaded(true)}
                    viewLabel="View"
                    viewIcon={<Eye size={12} />}
                  />
                );
              }
              return (
                <div className="relative group/img">
                  <img
                    src={src}
                    alt={att.fileName}
                    className="rounded-lg cursor-pointer block"
                    style={{ maxWidth: 280, maxHeight: 240, objectFit: "cover", width: "100%" }}
                    onClick={() => setExpandImg(src)}
                  />
                  <a
                    href={dlHref}
                    download={att.fileName}
                    className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    onClick={e => e.stopPropagation()}
                    title="Download"
                  >
                    <Download size={13} />
                  </a>
                  {msg.content && msg.content !== att.fileName && (
                    <p className="mt-1 text-sm">{msg.content}</p>
                  )}
                </div>
              );
            })()

          ) : msg.type === "file" && msg.attachments?.[0] && msg.attachments[0].fileType.startsWith("video/") ? (
            /* ── Video: placeholder until user taps Play ── */
            (() => {
              const att    = msg.attachments![0]!;
              const src    = `${API_ROOT}/${att.filePath}`;
              const dlHref = `/api/chat/attachments/${att.uuid}/download`;
              if (!mediaLoaded) {
                return (
                  <MediaPlaceholder
                    icon="🎬"
                    label={att.fileName}
                    size={att.fileSize}
                    isOwn={isOwn}
                    dlHref={dlHref}
                    dlName={att.fileName}
                    onView={() => setMediaLoaded(true)}
                    viewLabel="Play"
                    viewIcon={<Play size={12} />}
                  />
                );
              }
              return (
                <div className="rounded-lg overflow-hidden" style={{ maxWidth: 300 }}>
                  <div className="relative group/vid">
                    <video
                      src={src}
                      controls
                      autoPlay
                      className="rounded-t-lg block"
                      style={{ maxWidth: 300, maxHeight: 240, width: "100%" }}
                      preload="metadata"
                    />
                    <a
                      href={dlHref}
                      download={att.fileName}
                      className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover/vid:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                      onClick={e => e.stopPropagation()}
                      title="Download"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5"
                    style={{ background: isOwn ? "rgba(255,255,255,0.06)" : "var(--bg-elevated)" }}
                  >
                    <span className="text-xs flex-1 truncate" style={{ color: isOwn ? "rgba(255,255,255,0.7)" : "var(--text-secondary)" }}>
                      {att.fileName}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: isOwn ? "rgba(255,255,255,0.5)" : "var(--text-secondary)" }}>
                      {fmtBytes(att.fileSize)}
                    </span>
                  </div>
                </div>
              );
            })()

          ) : msg.type === "file" && msg.attachments?.[0] ? (
            /* ── Generic file card ── */
            (() => {
              const att    = msg.attachments![0]!;
              const dlHref = `/api/chat/attachments/${att.uuid}/download`;
              return (
                <div
                  className="flex items-center gap-2 p-2 rounded-lg min-w-[200px]"
                  style={{ background: isOwn ? "rgba(255,255,255,0.08)" : "var(--bg-elevated)" }}
                >
                  <span className="text-xl shrink-0">{fileTypeIcon(att.fileType)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{att.fileName}</p>
                    <p className="text-[10px]" style={{ color: isOwn ? "rgba(255,255,255,0.6)" : "var(--text-secondary)" }}>
                      {fmtBytes(att.fileSize)}
                    </p>
                  </div>
                  <a
                    href={dlHref}
                    download={att.fileName}
                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                    style={{ background: isOwn ? "rgba(255,255,255,0.15)" : "var(--bg-surface)", color: isOwn ? "#fff" : "var(--text-primary)" }}
                    onClick={e => e.stopPropagation()}
                    title="Download"
                  >
                    <Download size={12} />
                  </a>
                </div>
              );
            })()

          ) : (
            /* ── Plain text ── */
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</span>
          )}

          {/* Timestamp + edited */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {msg.isEdited && (
              <span className="text-[10px]" style={{ color: isOwn ? "rgba(255,255,255,0.5)" : "var(--text-secondary)" }}>
                edited
              </span>
            )}
            <span className="text-[10px]" style={{ color: isOwn ? "rgba(255,255,255,0.5)" : "var(--text-secondary)" }}>
              {timeStr(msg.createdAt)}
            </span>
          </div>
        </div>

        {/* Reactions */}
        {(msg.reactions?.length ?? 0) > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {msg.reactions!.map(r => (
              <button
                key={r.emoji}
                onClick={() => onReact(msg.uuid, r.emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors"
                style={{
                  background:  r.userReacted ? "rgba(3,255,148,0.15)" : "var(--bg-elevated)",
                  border:      r.userReacted ? "1px solid rgba(3,255,148,0.4)" : "1px solid var(--border)",
                  color:       r.userReacted ? "#03ff94" : "var(--text-secondary)",
                }}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded image overlay */}
      {expandImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setExpandImg(null)}
        >
          <img src={expandImg} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function MediaPlaceholder({
  icon, label, size, isOwn, dlHref, dlName, onView, viewLabel, viewIcon,
}: {
  icon: string;
  label: string;
  size: number;
  isOwn: boolean;
  dlHref: string;
  dlName: string;
  onView: () => void;
  viewLabel: string;
  viewIcon: React.ReactNode;
}) {
  const mutedColor = isOwn ? "rgba(255,255,255,0.55)" : "var(--text-secondary)";
  const cardBg     = isOwn ? "rgba(255,255,255,0.07)" : "var(--bg-elevated)";
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl px-4 py-4"
      style={{ background: cardBg, minWidth: 200, maxWidth: 260, border: `1px solid ${isOwn ? "rgba(255,255,255,0.12)" : "var(--border)"}` }}
    >
      <span className="text-3xl leading-none">{icon}</span>
      <div className="text-center min-w-0 w-full">
        <p
          className="text-xs font-medium truncate w-full"
          style={{ color: isOwn ? "#fff" : "var(--text-primary)" }}
        >
          {label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>
          {fmtBytes(size)}
        </p>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {/* View / Play */}
        <button
          onClick={onView}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: isOwn ? "rgba(255,255,255,0.18)" : "rgba(3,255,148,0.15)", color: isOwn ? "#fff" : "#03ff94" }}
        >
          {viewIcon}
          {viewLabel}
        </button>
        {/* Download */}
        <a
          href={dlHref}
          download={dlName}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: isOwn ? "rgba(255,255,255,0.10)" : "var(--bg-surface)", color: mutedColor, border: `1px solid ${isOwn ? "rgba(255,255,255,0.15)" : "var(--border)"}` }}
          onClick={e => e.stopPropagation()}
          title="Download"
        >
          <Download size={11} />
          Save
        </a>
      </div>
    </div>
  );
}

function ActionBtn({
  icon, title, onClick, danger = false,
}: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        color: danger ? "#ef4444" : "var(--text-secondary)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = danger ? "rgba(239,68,68,0.1)" : "var(--bg-surface)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
    >
      {icon}
    </button>
  );
}
