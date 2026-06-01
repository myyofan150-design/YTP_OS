"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Star, Pencil, Archive, RotateCcw, Trash2, Paperclip,
  Download, Trash, Loader2, Copy,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { timeAgo, resolveAssetUrl } from "@/lib/utils";
import { useNote } from "@/hooks/useNotes";
import { CategoryBadge } from "./CategoryBadge";
import { PriorityIndicator } from "./PriorityIndicator";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import type { NoteAttachment } from "@/types";

function fileUrl(filePath: string) { return resolveAssetUrl(filePath) ?? filePath; }

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string): string {
  if (type === "application/pdf")                        return "📄";
  if (type.startsWith("image/"))                        return "🖼️";
  if (type.includes("wordprocessingml"))                return "📝";
  if (type.includes("spreadsheetml"))                   return "📊";
  if (type.startsWith("video/"))                        return "🎬";
  if (type === "application/zip" || type.includes("zip")) return "📦";
  return "📎";
}

interface Props {
  noteUuid: string | null;
  onClose: () => void;
  onEdit: (uuid: string) => void;
  onRefetch?: () => void;
}

export function NoteDetailSheet({ noteUuid, onClose, onEdit, onRefetch }: Props) {
  const { note, isLoading, refetch } = useNote(noteUuid);
  const [uploading, setUploading]       = useState(false);
  const [deletingAtt, setDeletingAtt]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // trap focus / close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function duplicateNote() {
    if (!note) return;
    try {
      await api.post(`/notes/${note.uuid}/duplicate`);
      toast.success("Note duplicated");
      onRefetch?.();
    } catch { toast.error("Failed to duplicate"); }
  }

  async function toggleStar() {
    if (!note) return;
    try {
      await api.patch(`/notes/${note.uuid}/star`);
      refetch();
    } catch { toast.error("Failed"); }
  }

  async function toggleArchive() {
    if (!note) return;
    try {
      await api.patch(`/notes/${note.uuid}/archive`);
      toast.success(note.status === "archived" ? "Unarchived" : "Archived");
      refetch(); onRefetch?.();
    } catch { toast.error("Failed"); }
  }

  async function deleteNote() {
    if (!note) return;
    try {
      await api.delete(`/notes/${note.uuid}`);
      toast.success("Note deleted");
      onClose(); onRefetch?.();
    } catch { toast.error("Failed to delete"); }
  }

  async function uploadFile(file: File) {
    if (!note) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.post(`/notes/${note.uuid}/attachments`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File attached");
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteAttachment(att: NoteAttachment) {
    if (!note) return;
    setDeletingAtt(att.uuid);
    try {
      await api.delete(`/notes/${note.uuid}/attachments/${att.uuid}`);
      toast.success("Attachment removed");
      refetch();
    } catch { toast.error("Failed to remove"); }
    finally { setDeletingAtt(null); }
  }

  const isOpen = !!noteUuid;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col"
        style={{
          width: "min(560px, 100vw)",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
        }}
      >
        {isLoading || !note ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <X size={15} />
              </button>
              <h2 className="flex-1 text-base font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {note.title}
              </h2>
              <div className="flex items-center gap-1 shrink-0">
                <ActionBtn onClick={toggleStar} title={note.isStarred ? "Unstar" : "Star"}>
                  <Star size={14} fill={note.isStarred ? "#f59e0b" : "none"} style={{ color: note.isStarred ? "#f59e0b" : undefined }} />
                </ActionBtn>
                <ActionBtn onClick={duplicateNote} title="Duplicate">
                  <Copy size={14} />
                </ActionBtn>
                <ActionBtn onClick={() => onEdit(note.uuid)} title="Edit">
                  <Pencil size={14} />
                </ActionBtn>
                <ActionBtn onClick={toggleArchive} title={note.status === "archived" ? "Unarchive" : "Archive"}>
                  <Archive size={14} />
                </ActionBtn>
                {note.status === "deleted" && (
                  <ActionBtn onClick={async () => { await api.patch(`/notes/${note.uuid}/restore`); refetch(); onRefetch?.(); }} title="Restore">
                    <RotateCcw size={14} />
                  </ActionBtn>
                )}
                <ActionBtn onClick={deleteNote} title="Delete" danger>
                  <Trash2 size={14} />
                </ActionBtn>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Properties */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <PropRow label="Category"><CategoryBadge category={note.category} /></PropRow>
                  <PropRow label="Priority"><PriorityIndicator priority={note.priority} showLabel /></PropRow>
                  <PropRow label="Status">
                    <span
                      className="text-xs font-medium rounded-full px-2 py-0.5"
                      style={{
                        background: note.status === "active" ? "rgba(34,197,94,0.12)" : "var(--bg-elevated)",
                        color: note.status === "active" ? "#22c55e" : "var(--text-secondary)",
                      }}
                    >
                      {note.status[0].toUpperCase() + note.status.slice(1)}
                    </span>
                  </PropRow>
                  <PropRow label="Created">
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                      {note.createdByUser?.name ?? "—"} · {timeAgo(note.createdAt)}
                    </span>
                  </PropRow>
                  <PropRow label="Assigned To">
                    {note.assignedUser ? (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-primary)" }}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "#6366f1", color: "#fff" }}>
                          {note.assignedUser.name[0]?.toUpperCase()}
                        </span>
                        {note.assignedUser.name}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Unassigned</span>
                    )}
                  </PropRow>
                  {note.linkedModule && note.linkedModule !== "none" && (
                    <PropRow label="Linked To">
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                        {note.linkedModule[0].toUpperCase() + note.linkedModule.slice(1)}
                        {note.linkedClient && `: ${note.linkedClient.companyName}`}
                      </span>
                    </PropRow>
                  )}
                </div>
                {note.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <span
                        key={tag.uuid}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                        style={{ background: `${tag.color}22`, color: tag.color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <RichTextEditor value={note.content ?? ""} editable={false} />
              </div>

              {/* Mentions */}
              {note.mentions && note.mentions.length > 0 && (
                <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Mentioned</p>
                  <div className="flex flex-wrap gap-2">
                    {note.mentions.map(m => (
                      <span key={m.id} className="flex items-center gap-1.5 text-xs rounded-full px-2 py-1" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "#6366f1", color: "#fff" }}>
                          {m.user?.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        {m.user?.name ?? `User ${m.mentionedUserId}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Attachments {note.attachments && note.attachments.length > 0 ? `(${note.attachments.length})` : ""}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                    Attach File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.mov,.zip"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                  />
                </div>
                {note.attachments && note.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {note.attachments.map(att => (
                      <div
                        key={att.uuid}
                        className="flex items-center gap-3 rounded-lg p-2.5"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        {att.fileType.startsWith("image/") ? (
                          <a href={fileUrl(att.filePath)} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrl(att.filePath)}
                              alt={att.fileName}
                              className="h-10 w-10 rounded object-cover"
                            />
                          </a>
                        ) : (
                          <span className="text-2xl shrink-0">{fileIcon(att.fileType)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{att.fileName}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{fmtBytes(att.fileSize)}</p>
                        </div>
                        <a
                          href={fileUrl(att.filePath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => deleteAttachment(att)}
                          disabled={deletingAtt === att.uuid}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                          style={{ color: "#ef4444" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          {deletingAtt === att.uuid ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No attachments yet</p>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}

function ActionBtn({ onClick, title, danger, children }: { onClick: () => void; title?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{ color: danger ? "#ef4444" : "var(--text-secondary)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = danger ? "rgba(239,68,68,0.08)" : "var(--bg-elevated)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      {children}
    </div>
  );
}
