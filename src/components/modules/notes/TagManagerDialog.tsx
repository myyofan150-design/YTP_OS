"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Trash2, Check, XCircle } from "lucide-react";
import { useNoteTags } from "@/hooks/useNotes";
import type { NoteTag } from "@/types";

const PRESET_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

interface TagManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TagManagerDialog({ open, onClose }: TagManagerDialogProps) {
  const { tags, isLoading, createTag, updateTag, deleteTag } = useNoteTags();

  // new tag form
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // editing
  const [editingUuid, setEditingUuid]   = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editColor, setEditColor]       = useState("");
  const [saving, setSaving]             = useState(false);

  // delete confirm
  const [deleteUuid, setDeleteUuid] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    if (!open) { setEditingUuid(null); setDeleteUuid(null); setNewName(""); }
  }, [open]);

  if (!open) return null;

  function startEdit(tag: NoteTag) {
    setEditingUuid(tag.uuid);
    setEditName(tag.name);
    setEditColor(tag.color);
    setDeleteUuid(null);
  }

  async function handleSave() {
    if (!editingUuid || !editName.trim()) return;
    setSaving(true);
    await updateTag(editingUuid, { name: editName.trim(), color: editColor });
    setSaving(false);
    setEditingUuid(null);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const ok = await createTag(newName.trim(), newColor);
    setCreating(false);
    if (ok) { setNewName(""); setNewColor(PRESET_COLORS[0]); }
  }

  async function handleDelete(uuid: string) {
    setDeleting(true);
    await deleteTag(uuid);
    setDeleting(false);
    setDeleteUuid(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden animate-slide-up"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Manage Tags</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tag list */}
        <div className="max-h-72 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
          {isLoading ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>Loading…</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>No tags yet</p>
          ) : tags.map(tag => (
            <div key={tag.uuid}>
              {editingUuid === tag.uuid ? (
                /* Inline edit row */
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--bg-elevated)" }}>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditingUuid(null); }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    className="flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-40"
                    style={{ color: "#22c55e" }}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setEditingUuid(null)}
                    className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <XCircle size={13} />
                  </button>
                </div>
              ) : deleteUuid === tag.uuid ? (
                /* Delete confirmation row */
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                    Delete <strong>{tag.name}</strong>? Removes from all notes.
                  </span>
                  <button
                    onClick={() => handleDelete(tag.uuid)}
                    disabled={deleting}
                    className="rounded px-2 py-0.5 text-xs font-medium transition-opacity disabled:opacity-40"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeleteUuid(null)}
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    No
                  </button>
                </div>
              ) : (
                /* Normal row */
                <div
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: tag.color }} />
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{tag.name}</span>
                  {(tag.noteCount ?? 0) > 0 && (
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{tag.noteCount}</span>
                  )}
                  <button
                    onClick={() => startEdit(tag)}
                    className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => { setDeleteUuid(tag.uuid); setEditingUuid(null); }}
                    className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new tag */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Add New Tag</p>
          <div className="flex items-center gap-2">
            <ColorPicker value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="Tag name"
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {creating ? "…" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="h-4 w-4 rounded-full shrink-0 transition-transform"
          style={{
            background: c,
            outline: value === c ? `2px solid ${c}` : "none",
            outlineOffset: "2px",
            transform: value === c ? "scale(1.2)" : "scale(1)",
          }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-4 w-4 rounded-full cursor-pointer border-0 p-0"
        title="Custom color"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
