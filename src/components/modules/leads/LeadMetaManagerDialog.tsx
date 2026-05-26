"use client";

import { useState, useCallback, useEffect } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { ApiResponse, LeadMetaOption } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366F1", "#3B82F6", "#8B5CF6", "#EC4899",
  "#EF4444", "#F97316", "#F59E0B", "#10B981",
  "#22C55E", "#25D366", "#94A3B8", "#6B7280",
];

type TabKey = "source" | "status" | "priority" | "service";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "source",   label: "Sources"    },
  { key: "status",   label: "Statuses"   },
  { key: "priority", label: "Priorities" },
  { key: "service",  label: "Services"   },
];

interface MetaGroups {
  sources: LeadMetaOption[]; statuses: LeadMetaOption[];
  priorities: LeadMetaOption[]; services: LeadMetaOption[];
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const isCustom = !PRESET_COLORS.includes(value);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="h-6 w-6 rounded-full transition-all"
          style={{ background: c, outline: value === c ? `2px solid ${c}` : "2px solid transparent", outlineOffset: "2px", transform: value === c ? "scale(1.18)" : "scale(1)" }}
        />
      ))}
      <label className="relative h-6 w-6 cursor-pointer" title="Custom color">
        <div className="h-6 w-6 rounded-full" style={{ background: isCustom ? value : "transparent", border: isCustom ? "none" : "2px dashed var(--border)" }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
      </label>
    </div>
  );
}

// ─── LeadMetaManagerDialog ────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void; }

export function LeadMetaManagerDialog({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("source");
  const [meta, setMeta]           = useState<MetaGroups>({ sources: [], statuses: [], priorities: [], services: [] });
  const [loading, setLoading]     = useState(false);

  const [addMode, setAddMode]   = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addColor, setAddColor] = useState("#6366F1");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");

  const [editTarget, setEditTarget] = useState<LeadMetaOption | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [editColor, setEditColor]   = useState("#6366F1");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");

  const [confirmDelete, setConfirmDelete] = useState<LeadMetaOption | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState("");

  const fetchMeta = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<MetaGroups>>("/leads/meta");
      setMeta(res.data.data);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) fetchMeta(); }, [open, fetchMeta]);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setAddMode(false); setAddLabel(""); setAddColor("#6366F1"); setAddError("");
    setEditTarget(null); setEditError("");
    setConfirmDelete(null); setDeleteError("");
  }

  function currentItems(): LeadMetaOption[] {
    if (activeTab === "source")   return meta.sources;
    if (activeTab === "status")   return meta.statuses;
    if (activeTab === "priority") return meta.priorities;
    return meta.services;
  }

  async function handleAdd() {
    if (!addLabel.trim()) { setAddError("Label is required"); return; }
    setAddSaving(true); setAddError("");
    try {
      await api.post("/leads/meta", { type: activeTab, label: addLabel.trim(), color: addColor });
      await fetchMeta(); setAddMode(false); setAddLabel(""); setAddColor("#6366F1");
    } catch (err: unknown) {
      setAddError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save");
    } finally { setAddSaving(false); }
  }

  function startEdit(item: LeadMetaOption) {
    setEditTarget(item); setEditLabel(item.label); setEditColor(item.color);
    setEditError(""); setConfirmDelete(null); setDeleteError(""); setAddMode(false);
  }

  async function handleEdit() {
    if (!editLabel.trim()) { setEditError("Label is required"); return; }
    if (!editTarget) return;
    setEditSaving(true); setEditError("");
    try {
      await api.patch(`/leads/meta/${editTarget.uuid}`, { label: editLabel.trim(), color: editColor });
      await fetchMeta(); setEditTarget(null);
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save");
    } finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteError("");
    try {
      await api.delete(`/leads/meta/${confirmDelete.uuid}`);
      await fetchMeta(); setConfirmDelete(null);
    } catch (err: unknown) {
      setDeleteError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete");
    } finally { setDeleting(false); }
  }

  function renderRow(item: LeadMetaOption) {
    if (editTarget?.uuid === item.uuid) {
      return (
        <li key={item.uuid} className="space-y-3 rounded-lg p-3" style={{ background: "var(--bg-elevated)" }}>
          <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label" className="h-8 text-sm" autoFocus />
          <ColorPicker value={editColor} onChange={setEditColor} />
          {editError && <p className="text-xs rounded px-2 py-1" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{editError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEdit} disabled={editSaving} className="h-7 text-xs px-3">{editSaving ? "Saving…" : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditTarget(null); setEditError(""); }} className="h-7 text-xs px-3">Cancel</Button>
          </div>
        </li>
      );
    }
    if (confirmDelete?.uuid === item.uuid) {
      return (
        <li key={item.uuid} className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Delete <strong>&ldquo;{item.label}&rdquo;</strong>?</p>
          {deleteError && <p className="text-xs rounded px-2 py-1" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{deleteError}</p>}
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "#EF4444", color: "#fff" }}>
              <Check size={11} />{deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button onClick={() => { setConfirmDelete(null); setDeleteError(""); }}
              className="flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <X size={11} />No, keep
            </button>
          </div>
        </li>
      );
    }
    return (
      <li key={item.uuid}
        className="flex items-center gap-3 px-2 py-2 rounded-lg group transition-colors"
        style={{ borderBottom: "1px solid var(--border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
        <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => startEdit(item)} className="flex h-6 w-6 items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
            <Pencil size={12} />
          </button>
          <button onClick={() => { setConfirmDelete(item); setEditTarget(null); setAddMode(false); }}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
            <Trash2 size={12} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Manage Lead Meta</DialogTitle></DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
          {TABS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => switchTab(key)}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
              style={activeTab === key
                ? { background: "var(--accent)", color: "#000", fontWeight: 600 }
                : { color: "var(--text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[160px]">
          {loading ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
          ) : currentItems().length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} yet
            </p>
          ) : (
            <ul className="space-y-0.5">{currentItems().map(item => renderRow(item))}</ul>
          )}
        </div>

        {addMode ? (
          <div className="rounded-lg p-3 space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              New {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}
            </p>
            <Input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Label"
              className="h-8 text-sm" autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddMode(false); setAddError(""); }}} />
            <ColorPicker value={addColor} onChange={setAddColor} />
            {addError && <p className="text-xs rounded px-2 py-1" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{addError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addSaving} className="h-7 text-xs px-3">{addSaving ? "Saving…" : "Add"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setAddMode(false); setAddLabel(""); setAddColor("#6366F1"); setAddError(""); }} className="h-7 text-xs px-3">Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAddMode(true); setEditTarget(null); setConfirmDelete(null); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
            style={{ border: "1px dashed var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-secondary)"; }}>
            <Plus size={14} />Add New {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
