"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Check, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { PriorityIndicator } from "./PriorityIndicator";
import { useNoteTags } from "@/hooks/useNotes";
import type { Note, NoteTag } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  noteUuid?: string;
  defaultValues?: Partial<Note>;
  onSaved?: () => void;
}

const CATEGORIES = [
  { value: "personal",  label: "Personal"  },
  { value: "business",  label: "Business"  },
  { value: "client",    label: "Client"    },
  { value: "lead",      label: "Lead"      },
  { value: "project",   label: "Project"   },
  { value: "meeting",   label: "Meeting"   },
  { value: "branding",  label: "Branding"  },
  { value: "other",     label: "Other"     },
];

const PRIORITIES = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

interface UserOption { id: number; name: string; avatarUrl?: string | null; }

export function NoteFormDialog({ open, onClose, noteUuid, defaultValues, onSaved }: Props) {
  const isEdit = !!noteUuid;
  const { tags: allTags, createTag: createTagFn } = useNoteTags();

  // Form state
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [category, setCategory]     = useState("personal");
  const [priority, setPriority]     = useState("low");
  const [status, setStatus]         = useState("active");
  const [selectedTagUuids, setSelectedTagUuids] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<UserOption | null>(null);

  // Tag input
  const [tagInput, setTagInput]     = useState("");
  const [tagDropOpen, setTagDropOpen] = useState(false);

  // User search
  const [users, setUsers]           = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userDropOpen, setUserDropOpen] = useState(false);

  // Save state
  const [saving, setSaving]           = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle"|"saving"|"saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note data in edit mode
  useEffect(() => {
    if (!open) return;
    if (isEdit && noteUuid) {
      api.get<{ success: boolean; data: Note }>(`/notes/${noteUuid}`)
        .then(r => {
          const n = r.data.data;
          setTitle(n.title);
          setContent(n.content ?? "");
          setCategory(n.category);
          setPriority(n.priority);
          setStatus(n.status);
          setSelectedTagUuids(n.tags.map(t => t.uuid));
          if (n.assignedUser) setAssignedTo({ id: n.assignedTo!, name: n.assignedUser.name, avatarUrl: n.assignedUser.avatarUrl });
        })
        .catch(() => toast.error("Failed to load note"));
    } else {
      // reset form for create
      setTitle(defaultValues?.title ?? "");
      setContent(defaultValues?.content ?? "");
      setCategory(defaultValues?.category ?? "personal");
      setPriority(defaultValues?.priority ?? "low");
      setStatus("active");
      setSelectedTagUuids(defaultValues?.tags?.map(t => t.uuid) ?? []);
      setAssignedTo(null);
    }
  }, [open, isEdit, noteUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch users once
  useEffect(() => {
    if (!open) return;
    api.get<{ data: UserOption[] }>("/users")
      .then(r => setUsers(r.data.data ?? []))
      .catch(() => {});
  }, [open]);

  // Auto-save in edit mode
  const autoSave = useCallback(async (titleVal: string, contentVal: string) => {
    if (!isEdit || !noteUuid) return;
    setAutoSaveState("saving");
    try {
      await api.patch(`/notes/${noteUuid}`, { title: titleVal, content: contentVal });
      setAutoSaveState("saved");
      setTimeout(() => setAutoSaveState("idle"), 2000);
    } catch {
      setAutoSaveState("idle");
    }
  }, [isEdit, noteUuid]);

  function scheduleAutoSave(titleVal: string, contentVal: string) {
    if (!isEdit) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(titleVal, contentVal), 2000);
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), content, category, priority, status, tagIds: selectedTagUuids, assignedTo: assignedTo?.id ?? null };
      if (isEdit) {
        await api.patch(`/notes/${noteUuid}`, payload);
        toast.success("Note updated");
      } else {
        await api.post("/notes", payload);
        toast.success("Note created");
      }
      onSaved?.();
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update note" : "Failed to create note");
    } finally {
      setSaving(false);
    }
  }

  // Tag selection
  const selectedTagObjects = allTags.filter(t => selectedTagUuids.includes(t.uuid));
  const filteredTags = allTags.filter(t =>
    !selectedTagUuids.includes(t.uuid) &&
    t.name.toLowerCase().includes(tagInput.toLowerCase())
  );
  const canCreateTag = tagInput.trim() && !allTags.find(t => t.name.toLowerCase() === tagInput.toLowerCase());

  function addTag(tag: NoteTag) {
    setSelectedTagUuids(prev => [...prev, tag.uuid]);
    setTagInput("");
    setTagDropOpen(false);
  }

  function removeTag(uuid: string) {
    setSelectedTagUuids(prev => prev.filter(u => u !== uuid));
  }

  async function createAndAddTag() {
    if (!tagInput.trim()) return;
    const ok = await createTagFn(tagInput.trim());
    if (ok) {
      // the hook will refetch tags; we need to pick the new one up
      // wait briefly then add by name match
      setTimeout(() => {
        // tags may not be updated yet; we'll just close the dropdown and let user re-select
        setTagInput("");
        setTagDropOpen(false);
      }, 300);
    }
  }

  // User selection
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 10);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden animate-slide-up flex flex-col"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-lg)",
          minHeight: "600px",
          maxHeight: "90vh",
        }}
      >
        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Note" : "New Note"}
          </h2>
          <div className="flex items-center gap-3">
            {isEdit && autoSaveState !== "idle" && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {autoSaveState === "saving" ? <><Loader2 size={11} className="animate-spin" />Saving…</> : <><Check size={11} style={{ color: "#22c55e" }} />Saved</>}
              </span>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left column */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6 gap-4 min-w-0">
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); scheduleAutoSave(e.target.value, content); }}
              placeholder="Note title..."
              className="w-full bg-transparent text-xl font-semibold outline-none placeholder:font-normal"
              style={{ color: "var(--text-primary)" }}
            />
            <div className="flex-1" style={{ minHeight: "300px" }}>
              <RichTextEditor
                value={content}
                onChange={v => { setContent(v); scheduleAutoSave(title, v); }}
                placeholder="Start writing..."
              />
            </div>
          </div>

          {/* Right column — Properties */}
          <div
            className="w-[260px] shrink-0 flex flex-col gap-5 overflow-y-auto p-5"
            style={{ borderLeft: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Properties</p>

            {/* Category */}
            <PropField label="Category">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </PropField>

            {/* Priority */}
            <PropField label="Priority">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="mt-1">
                <PriorityIndicator priority={priority} showLabel />
              </div>
            </PropField>

            {/* Status */}
            <PropField label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </PropField>

            {/* Tags */}
            <PropField label="Tags">
              <div
                className="w-full rounded-lg p-1.5 min-h-[34px] flex flex-wrap gap-1"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                {selectedTagObjects.map(tag => (
                  <span
                    key={tag.uuid}
                    className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[11px]"
                    style={{ background: `${tag.color}22`, color: tag.color }}
                  >
                    {tag.name}
                    <button onClick={() => removeTag(tag.uuid)} className="flex items-center justify-center h-3 w-3 rounded-full" style={{ background: `${tag.color}44` }}>
                      <X size={8} />
                    </button>
                  </span>
                ))}
                <div className="relative flex-1 min-w-[60px]">
                  <input
                    value={tagInput}
                    onChange={e => { setTagInput(e.target.value); setTagDropOpen(true); }}
                    onFocus={() => setTagDropOpen(true)}
                    onBlur={() => setTimeout(() => setTagDropOpen(false), 150)}
                    placeholder={selectedTagUuids.length === 0 ? "Add tags…" : ""}
                    className="w-full bg-transparent text-xs outline-none px-1 py-0.5"
                    style={{ color: "var(--text-primary)" }}
                  />
                  {tagDropOpen && (filteredTags.length > 0 || canCreateTag) && (
                    <div
                      className="absolute left-0 top-full mt-1 z-30 w-44 rounded-lg overflow-hidden py-1"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
                    >
                      {filteredTags.slice(0, 6).map(tag => (
                        <button
                          key={tag.uuid}
                          onMouseDown={() => addTag(tag)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tag.color }} />
                          {tag.name}
                        </button>
                      ))}
                      {canCreateTag && (
                        <button
                          onMouseDown={createAndAddTag}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs"
                          style={{ color: "var(--accent)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          Create &ldquo;{tagInput}&rdquo;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </PropField>

            {/* Assigned To */}
            <PropField label="Assigned To">
              <div className="relative">
                {assignedTo ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0" style={{ background: "#6366f1", color: "#fff" }}>
                      {assignedTo.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 text-xs truncate" style={{ color: "var(--text-primary)" }}>{assignedTo.name}</span>
                    <button onClick={() => setAssignedTo(null)} style={{ color: "var(--text-secondary)" }}><X size={12} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setUserDropOpen(true); }}
                      onFocus={() => setUserDropOpen(true)}
                      onBlur={() => setTimeout(() => setUserDropOpen(false), 150)}
                      placeholder="Search user…"
                      className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    />
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
                    {userDropOpen && filteredUsers.length > 0 && (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg overflow-hidden py-1"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
                      >
                        {filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onMouseDown={() => { setAssignedTo(u); setUserSearch(""); setUserDropOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs"
                            style={{ color: "var(--text-primary)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0" style={{ background: "#6366f1", color: "#fff" }}>
                              {u.name[0]?.toUpperCase()}
                            </span>
                            {u.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </PropField>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? "Update Note" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      {children}
    </div>
  );
}
