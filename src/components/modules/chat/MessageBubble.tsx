"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Reply, Pin, Pencil, Trash2, Download, Eye, Play,
  ChevronDown, Info, Copy, Star, CheckSquare, Share2,
} from "lucide-react";
import type { ChatMessage } from "@/types";

import { resolveAssetUrl } from "@/lib/utils";
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "✅"];

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  ownBg:      "#00BFA5",   // teal bubble
  otherBg:    "#ffffff",   // white bubble
  ownText:    "#ffffff",
  otherText:  "#111827",
  ts:         "#667781",   // timestamp gray
  tick:       "#53BDEB",   // blue double-tick
  green:      "#00BFA5",
  replyLine:  "#00BFA5",
  menuBg:     "#233138",
  menuHover:  "#182229",
  menuBorder: "rgba(134,150,160,0.15)",
  menuText:   "#E9EDEF",
  menuMuted:  "#8696A0",
};

const BUBBLE_SHADOW = "0 1px 0.5px rgba(11,20,26,0.13)";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getExt(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() ?? "FILE";
}

function extColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const m: Record<string, string> = {
    pdf: "#E53935", doc: "#1565C0", docx: "#1565C0",
    xls: "#2E7D32", xlsx: "#2E7D32", csv: "#00897B",
    ppt: "#E64A19", pptx: "#E64A19",
    zip: "#F57C00", rar: "#F57C00", "7z": "#F57C00",
    txt: "#546E7A", mp3: "#6A1B9A",
  };
  return m[ext] ?? "#455A64";
}

function fileEmoji(mime: string): string {
  if (mime.includes("pdf"))                            return "📄";
  if (mime.includes("word"))                           return "📝";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  if (mime.startsWith("audio/"))                       return "🎵";
  return "📎";
}

function timeStr(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  message:          ChatMessage;
  isOwn:            boolean;
  isGroup:          boolean;
  onReply:          (msg: ChatMessage) => void;
  onReact:          (msgUuid: string, emoji: string) => void;
  onPin:            (msgUuid: string, isPinned: boolean) => void;
  onEdit:           (msg: ChatMessage) => void;
  onDelete:         (msgUuid: string) => void;
  currentUserId:    number;
  currentUserRole:  string;
  conversationUuid: string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

// ── MessageBubble ─────────────────────────────────────────────────────────────

export function MessageBubble({
  message: msg, isOwn, isGroup,
  onReply, onReact, onPin, onEdit, onDelete, currentUserRole,
}: Props) {
  const [hovered,     setHovered]     = useState(false);
  const [emojiOpen,   setEmojiOpen]   = useState(false);
  const [ctxOpen,     setCtxOpen]     = useState(false);
  const [expandImg,   setExpandImg]   = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const ctxBtnRef  = useRef<HTMLButtonElement>(null);

  const canDelete = isOwn || ADMIN_ROLES.includes(currentUserRole);
  const isAdmin   = ADMIN_ROLES.includes(currentUserRole);

  useEffect(() => {
    if (!ctxOpen) return;
    const fn = (e: MouseEvent) => {
      if (
        !ctxMenuRef.current?.contains(e.target as Node) &&
        !ctxBtnRef.current?.contains(e.target as Node)
      ) setCtxOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [ctxOpen]);

  const copyText = useCallback(() => {
    if (msg.content) navigator.clipboard.writeText(msg.content).catch(() => {});
    setCtxOpen(false);
  }, [msg.content]);

  // System message
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11.5px] px-3 py-1 rounded-full" style={{ color: "#667781", background: "rgba(11,20,26,0.06)" }}>
          {msg.content}
        </span>
      </div>
    );
  }

  const bg       = isOwn ? C.ownBg    : C.otherBg;
  const textCol  = isOwn ? C.ownText  : C.otherText;
  const mutedCol = isOwn ? "rgba(255,255,255,0.72)" : C.ts;

  const renderTimestamp = () => (
    <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {msg.isEdited && (
        <span className="text-[10.5px]" style={{ color: C.ts }}>edited ·</span>
      )}
      <span className="text-[11px]" style={{ color: C.ts }}>{timeStr(msg.createdAt)}</span>
      {isOwn && !msg.isDeleted && (
        <span className="text-[12px] leading-none" style={{ color: C.tick }}>✓✓</span>
      )}
    </div>
  );

  return (
    <div
      className={`flex mb-1 px-2 ${isOwn ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiOpen(false); }}
    >
      {/* Avatar — others in group */}
      {!isOwn && isGroup && (
        <div className="shrink-0 mr-2 self-end mb-4">
          {resolveAssetUrl(msg.sender?.avatarUrl) ? (
            <img src={resolveAssetUrl(msg.sender?.avatarUrl)!} alt={msg.sender?.name ?? ""}
              className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `hsl(${(msg.sender?.name ?? "").charCodeAt(0) % 360},55%,45%)` }}>
              {msg.sender?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Group sender name */}
        {!isOwn && isGroup && (
          <span className="text-[12px] font-semibold ml-1 mb-0.5" style={{ color: C.green }}>
            {msg.sender?.name ?? ""}
          </span>
        )}

        {/* Row: [emoji-btn]  [bubble]  (reversed for own) */}
        <div className={`flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}>

          {/* Emoji reaction button */}
          {hovered && !msg.isDeleted && (
            <div className="relative shrink-0 self-end mb-1">
              <button
                onClick={() => setEmojiOpen(v => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-all hover:scale-110"
                style={{ background: "rgba(0,0,0,0.08)", color: C.ts }}
                title="React"
              >
                😊
              </button>

              {/* Dark emoji pill (WhatsApp style) */}
              {emojiOpen && (
                <div
                  className="absolute z-30 flex items-center rounded-full shadow-2xl"
                  style={{
                    background: "rgba(20,20,20,0.92)", backdropFilter: "blur(12px)",
                    padding: "4px 6px", bottom: "calc(100% + 10px)",
                    ...(isOwn ? { right: "-4px" } : { left: "-4px" }),
                    gap: 2, whiteSpace: "nowrap",
                  }}
                >
                  {QUICK_EMOJIS.slice(0, 6).map(e => (
                    <button key={e} onClick={() => { onReact(msg.uuid, e); setEmojiOpen(false); }}
                      className="flex h-9 w-9 items-center justify-center text-xl rounded-full transition-all hover:scale-125 hover:bg-white/10">
                      {e}
                    </button>
                  ))}
                  <span style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)", display: "inline-block", margin: "0 4px", flexShrink: 0 }} />
                  <button onClick={() => setEmojiOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white text-base font-bold hover:bg-white/10">
                    +
                  </button>
                  <div style={{
                    position: "absolute", bottom: -5,
                    ...(isOwn ? { right: 12 } : { left: 12 }),
                    width: 0, height: 0,
                    borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                    borderTop: "5px solid rgba(20,20,20,0.92)",
                  }} />
                </div>
              )}
            </div>
          )}

          {/* ── Bubble ── */}
          <div
            className="relative rounded-[8px] overflow-hidden"
            style={{ background: bg, color: textCol, boxShadow: BUBBLE_SHADOW, minWidth: 72 }}
          >
            {/* Chevron ▼ (top-right, on hover) */}
            {hovered && !msg.isDeleted && (
              <div
                className="absolute top-0 right-0 z-10"
                style={{
                  background: `linear-gradient(135deg, transparent 35%, ${bg} 60%)`,
                  padding: "4px 4px 10px 16px",
                  borderTopRightRadius: 8,
                }}
              >
                <button
                  ref={ctxBtnRef}
                  onClick={() => setCtxOpen(v => !v)}
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ color: mutedCol }}
                  title="More options"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}

            {/* Context menu */}
            {ctxOpen && (
              <div ref={ctxMenuRef}
                className="absolute z-50 rounded-lg overflow-hidden shadow-2xl"
                style={{
                  top: 22,
                  ...(isOwn ? { right: 0 } : { left: 0 }),
                  minWidth: 172,
                  background: C.menuBg,
                  border: `1px solid ${C.menuBorder}`,
                }}
              >
                <CMenuItem icon={<Info size={14} />}        label="Message info" onClick={() => setCtxOpen(false)} />
                <CMenuItem icon={<Reply size={14} />}       label="Reply"        onClick={() => { onReply(msg); setCtxOpen(false); }} />
                <CMenuItem icon={<Copy size={14} />}        label="Copy"         onClick={copyText} />
                {isAdmin && <CMenuItem icon={<Pin size={14} />} label={msg.isPinned ? "Unpin" : "Pin"} onClick={() => { onPin(msg.uuid, msg.isPinned); setCtxOpen(false); }} />}
                <CMenuItem icon={<Star size={14} />}        label="Star"         onClick={() => setCtxOpen(false)} />
                <CMenuItem icon={<CheckSquare size={14} />} label="Select"       onClick={() => setCtxOpen(false)} />
                {isOwn && <CMenuItem icon={<Pencil size={14} />} label="Edit"    onClick={() => { onEdit(msg); setCtxOpen(false); }} />}
                <CMenuItem icon={<Share2 size={14} />}      label="Share"        onClick={() => setCtxOpen(false)} />
                {canDelete && <CMenuItem icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(msg.uuid); setCtxOpen(false); }} danger />}
              </div>
            )}

            {/* Reply quote */}
            {msg.replyTo && (
              <div className="mx-2 mt-2 mb-0 px-2 py-1 rounded-[4px] border-l-2"
                style={{ background: isOwn ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.04)", borderLeftColor: C.replyLine }}>
                <span className="text-xs font-semibold block" style={{ color: isOwn ? "rgba(255,255,255,0.9)" : C.green }}>
                  {msg.replyTo.sender?.name ?? "Unknown"}
                </span>
                <p className="text-xs truncate" style={{ color: mutedCol }}>
                  {msg.replyTo.isDeleted ? "This message was deleted" : msg.replyTo.content}
                </p>
              </div>
            )}

            {/* Content */}
            {msg.isDeleted ? (
              <p className="px-2.5 py-2 text-sm italic" style={{ color: mutedCol }}>
                🚫 This message was deleted
              </p>

            ) : msg.type === "image" && msg.attachments?.[0] ? (
              (() => {
                const att = msg.attachments![0]!;
                const src = resolveAssetUrl(att.filePath) ?? att.filePath;
                const dlHref = `/api/chat/attachments/${att.uuid}/download`;
                if (!mediaLoaded) return (
                  <WaMedia icon="🖼️" label={att.fileName} size={att.fileSize} dlHref={dlHref} dlName={att.fileName}
                    onView={() => setMediaLoaded(true)} viewLabel="View" viewIcon={<Eye size={12} />} isOwn={isOwn} />
                );
                return (
                  <div className="relative group/img">
                    <img src={src} alt={att.fileName} onClick={() => setExpandImg(src)}
                      className="block cursor-pointer w-full" style={{ maxWidth: 280, maxHeight: 240, objectFit: "cover" }} />
                    <a href={dlHref} download={att.fileName} onClick={e => e.stopPropagation()}
                      className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      <Download size={13} />
                    </a>
                    {msg.content && msg.content !== att.fileName && (
                      <p className="px-2.5 pt-1.5 pb-1 text-sm" style={{ color: textCol }}>{msg.content}</p>
                    )}
                  </div>
                );
              })()

            ) : msg.type === "file" && msg.attachments?.[0] && msg.attachments[0].fileType.startsWith("video/") ? (
              (() => {
                const att = msg.attachments![0]!;
                const src = resolveAssetUrl(att.filePath) ?? att.filePath;
                const dlHref = `/api/chat/attachments/${att.uuid}/download`;
                if (!mediaLoaded) return (
                  <WaMedia icon="🎬" label={att.fileName} size={att.fileSize} dlHref={dlHref} dlName={att.fileName}
                    onView={() => setMediaLoaded(true)} viewLabel="Play" viewIcon={<Play size={12} />} isOwn={isOwn} />
                );
                return (
                  <div className="relative group/vid">
                    <video src={src} controls autoPlay preload="metadata" className="block"
                      style={{ maxWidth: 300, maxHeight: 240, width: "100%" }} />
                    <a href={dlHref} download={att.fileName} onClick={e => e.stopPropagation()}
                      className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover/vid:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      <Download size={13} />
                    </a>
                  </div>
                );
              })()

            ) : msg.type === "file" && msg.attachments?.[0] ? (
              /* WhatsApp-style file card */
              (() => {
                const att    = msg.attachments![0]!;
                const dlHref = `/api/chat/attachments/${att.uuid}/download`;
                const ext    = getExt(att.fileName);
                const color  = extColor(att.fileName);
                const emoji  = fileEmoji(att.fileType);
                return (
                  <div className="flex flex-col" style={{ minWidth: 220 }}>
                    <div className="flex items-center gap-3 px-3 pt-2.5 pb-2">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg" style={{ background: color }}>
                        <span className="text-[8px] font-bold text-white leading-none tracking-wide">{ext}</span>
                        <span className="text-[20px] leading-none mt-0.5">{emoji}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: textCol }}>{att.fileName}</p>
                        <p className="text-xs mt-0.5" style={{ color: mutedCol }}>{ext} · {fmtBytes(att.fileSize)}</p>
                      </div>
                    </div>
                    <div style={{ height: 1, background: isOwn ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)" }} />
                    <div className="flex">
                      <a href={resolveAssetUrl(att.filePath) ?? att.filePath} target="_blank" rel="noreferrer"
                        className="flex flex-1 items-center justify-center py-2 text-xs font-semibold hover:opacity-75 transition-opacity"
                        style={{ color: isOwn ? "rgba(255,255,255,0.9)" : C.green }}
                        onClick={e => e.stopPropagation()}>
                        Open
                      </a>
                      <div style={{ width: 1, background: isOwn ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)" }} />
                      <a href={dlHref} download={att.fileName}
                        className="flex flex-1 items-center justify-center py-2 text-xs font-semibold hover:opacity-75 transition-opacity"
                        style={{ color: isOwn ? "rgba(255,255,255,0.9)" : C.green }}
                        onClick={e => e.stopPropagation()}>
                        Save as...
                      </a>
                    </div>
                  </div>
                );
              })()

            ) : (
              <p className="px-2.5 py-2 text-sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: textCol, lineHeight: "1.45" }}>
                {msg.content}
              </p>
            )}
          </div>
        </div>

        {/* ── Timestamp (outside bubble) ── */}
        {renderTimestamp()}

        {/* ── Reactions ── */}
        {(msg.reactions?.length ?? 0) > 0 && (
          <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
            {msg.reactions!.map(r => (
              <button key={r.emoji} onClick={() => onReact(msg.uuid, r.emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors"
                style={{
                  background: r.userReacted ? "rgba(0,191,165,0.12)" : "#fff",
                  borderColor: r.userReacted ? C.green : "#e5e7eb",
                  color:       r.userReacted ? C.green : "#6b7280",
                  boxShadow:   BUBBLE_SHADOW,
                }}>
                <span>{r.emoji}</span><span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {expandImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setExpandImg(null)}>
          <img src={expandImg} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Context menu item ─────────────────────────────────────────────────────────

function CMenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
      style={{ color: danger ? "#EF4444" : C.menuText }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.menuHover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      <span style={{ color: danger ? "#EF4444" : C.menuMuted }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Media placeholder ─────────────────────────────────────────────────────────

function WaMedia({ icon, label, size, dlHref, dlName, onView, viewLabel, viewIcon, isOwn }: {
  icon: string; label: string; size: number; dlHref: string; dlName: string;
  onView: () => void; viewLabel: string; viewIcon: React.ReactNode; isOwn: boolean;
}) {
  const mutedCol = isOwn ? "rgba(255,255,255,0.72)" : C.ts;
  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-3 pb-2" style={{ minWidth: 200, maxWidth: 260 }}>
      <span className="text-4xl leading-none">{icon}</span>
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-medium truncate" style={{ color: isOwn ? "#fff" : C.otherText }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: mutedCol }}>{fmtBytes(size)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onView}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: isOwn ? "rgba(255,255,255,0.2)" : "rgba(0,191,165,0.12)", color: isOwn ? "#fff" : C.green }}>
          {viewIcon}{viewLabel}
        </button>
        <a href={dlHref} download={dlName} onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: "rgba(0,0,0,0.08)", color: mutedCol }}>
          <Download size={11} />Save
        </a>
      </div>
    </div>
  );
}
