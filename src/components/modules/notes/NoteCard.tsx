"use client";

import { useState } from "react";
import { Star, Paperclip, MoreHorizontal, Archive, Trash2, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { CategoryBadge } from "./CategoryBadge";
import { PriorityIndicator } from "./PriorityIndicator";
import { NoteContentExcerpt } from "./NoteContentExcerpt";
import type { Note } from "@/types";

const PRIORITY_BORDER: Record<string, string> = {
  low:      "#22c55e",
  medium:   "#f59e0b",
  high:     "#ef4444",
  critical: "#ef4444",
};

interface NoteCardProps {
  note: Note;
  onOpen: (uuid: string) => void;
  onSelect?: (uuid: string, checked: boolean) => void;
  isSelected?: boolean;
  onRefetch?: () => void;
}

export function NoteCard({ note, onOpen, onSelect, isSelected = false, onRefetch }: NoteCardProps) {
  const [starred, setStarred] = useState(note.isStarred);
  const [menuOpen, setMenuOpen] = useState(false);

  async function toggleStar(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !starred;
    setStarred(next);
    try {
      await api.patch(`/notes/${note.uuid}/star`);
    } catch {
      setStarred(!next);
      toast.error("Failed to update star");
    }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await api.post(`/notes/${note.uuid}/duplicate`);
      toast.success("Note duplicated");
      onRefetch?.();
    } catch {
      toast.error("Failed to duplicate note");
    }
  }

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await api.patch(`/notes/${note.uuid}/archive`);
      toast.success(note.status === "archived" ? "Note unarchived" : "Note archived");
      onRefetch?.();
    } catch {
      toast.error("Failed");
    }
  }

  async function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await api.patch(`/notes/${note.uuid}/restore`);
      toast.success("Note restored");
      onRefetch?.();
    } catch {
      toast.error("Failed to restore note");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await api.delete(`/notes/${note.uuid}`);
      toast.success("Note deleted");
      onRefetch?.();
    } catch {
      toast.error("Failed to delete note");
    }
  }

  const borderColor = PRIORITY_BORDER[note.priority] ?? "#6366f1";
  const displayedTags = note.tags.slice(0, 3);
  const extraTags = note.tags.length - 3;
  const isDeleted = note.status === "deleted";

  return (
    <div
      className="group relative rounded-xl cursor-pointer transition-all duration-150"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        opacity: isDeleted ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        el.style.borderColor = "var(--accent)";
        el.style.borderLeftColor = borderColor;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        el.style.borderColor = "var(--border)";
        el.style.borderLeftColor = borderColor;
        setMenuOpen(false);
      }}
      onClick={() => !isDeleted && onOpen(note.uuid)}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="transition-opacity shrink-0"
            style={{ opacity: isSelected ? 1 : undefined }}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={e => onSelect?.(note.uuid, e.target.checked)}
              className="h-3.5 w-3.5 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ accentColor: "var(--accent)", opacity: isSelected ? 1 : undefined }}
            />
          </div>
          <CategoryBadge category={note.category} />
          <div className="flex-1" />
          {!isDeleted && (
            <button
              onClick={toggleStar}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors shrink-0"
              style={{ color: starred ? "#f59e0b" : "var(--text-secondary)" }}
            >
              <Star size={13} fill={starred ? "#f59e0b" : "none"} />
            </button>
          )}
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-30 w-40 overflow-hidden rounded-lg py-1"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
                onClick={e => e.stopPropagation()}
              >
                {note.status === "deleted" ? (
                  <button
                    onClick={handleRestore}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs"
                    style={{ color: "#22c55e" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <RotateCcw size={12} />Restore
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleDuplicate}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Copy size={12} />Duplicate
                    </button>
                    <button
                      onClick={handleArchive}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Archive size={12} />{note.status === "archived" ? "Unarchive" : "Archive"}
                    </button>
                  </>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs"
                  style={{ color: "#ef4444" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Trash2 size={12} />Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-semibold mb-1.5 leading-snug"
          style={{
            color: "var(--text-primary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.title}
        </h3>

        {/* Excerpt */}
        {(note.contentExcerpt || note.content) && (
          <div className="mb-2">
            <NoteContentExcerpt content={note.contentExcerpt ?? note.content} maxChars={120} />
          </div>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {displayedTags.map(tag => (
              <span
                key={tag.uuid}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: `${tag.color}22`, color: tag.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                {tag.name}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2">
          <PriorityIndicator priority={note.priority} />
          {note.assignedUser && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold shrink-0"
                style={{ background: "#6366f1", color: "#fff" }}
              >
                {note.assignedUser.name[0]?.toUpperCase()}
              </span>
              <span className="truncate max-w-[60px]">{note.assignedUser.name.split(" ")[0]}</span>
            </span>
          )}
          {(note.attachmentCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <Paperclip size={10} />
              {note.attachmentCount}
            </span>
          )}
          <span className="ml-auto text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>
            {timeAgo(note.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
