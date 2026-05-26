"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Trash2, CheckCircle2, Circle, ChevronDown,
  Plus, Paperclip, Download, Bell, BellOff, Loader2, Copy,
  Flag, Calendar, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { useTodoTask, useTodoLists } from "@/hooks/useTodo";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { BG_COLOR_OPTIONS } from "./TaskBgColor";
import { DueDateChip } from "./DueDateChip";
import type { TodoSubtask, TodoAttachment, ApiResponse } from "@/types";

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["bg-orange-400","bg-teal-500","bg-purple-500","bg-blue-500","bg-pink-400","bg-amber-500","bg-cyan-500","bg-rose-400"];
function nameColor(name: string) {
  return AVATAR_COLORS[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Priority chip colors ───────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string>  = { none: "#9CA3AF", low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const PRIORITY_BG: Record<string, string>       = { none: "rgba(156,163,175,.10)", low: "rgba(34,197,94,.10)", medium: "rgba(245,158,11,.10)", high: "rgba(239,68,68,.10)" };
const PRIORITY_BORDER: Record<string, string>   = { none: "rgba(156,163,175,.22)", low: "rgba(34,197,94,.22)", medium: "rgba(245,158,11,.22)", high: "rgba(239,68,68,.22)" };
const PRIORITY_LABELS: Record<string, string>   = { none: "None", low: "Low", medium: "Medium", high: "High" };
const PRIORITIES = ["none", "low", "medium", "high"] as const;
const REPEAT_TYPES = ["none", "daily", "weekdays", "weekly", "monthly", "yearly"] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  taskUuid: string | null;
  onClose: () => void;
  onUpdate?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TaskDetailDrawer({ taskUuid, onClose, onUpdate }: Props) {
  const { task, loading, refetch, updateTask, toggleStatus, deleteTask } = useTodoTask(taskUuid);
  const { lists } = useTodoLists();

  const [editTitle, setEditTitle]   = useState(false);
  const [titleVal, setTitleVal]     = useState("");
  const [editDesc, setEditDesc]     = useState(false);
  const [descVal, setDescVal]       = useState("");
  const [saving, setSaving]         = useState<string | null>(null);
  const [newSubtitle, setNewSubtitle]   = useState("");
  const [noteHtml, setNoteHtml]         = useState("");
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reminderMode, setReminderMode] = useState<"hidden" | "quick" | "custom">("hidden");
  const [customReminder, setCustomReminder] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]     = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Member picker
  const [users, setUsers] = useState<Array<{id:number;name:string;avatarUrl?:string|null}>>([]);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<ApiResponse<Array<{id:number;name:string;avatarUrl?:string|null}>>>("/users", { params: { status: "ACTIVE" } })
      .then(r => setUsers(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (memberPickerRef.current && !memberPickerRef.current.contains(e.target as Node))
        setMemberPickerOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function currentMembers() {
    if (task?.members && task.members.length > 0) return task.members;
    if (task?.assignedTo) {
      const u = users.find(u => u.id === task.assignedTo);
      return u ? [u] : [];
    }
    return [];
  }

  async function addMember(userId: number) {
    setMemberPickerOpen(false);
    const current = currentMembers().map(m => m.id);
    if (current.includes(userId)) return;
    await save({ memberIds: [...current, userId] }, "members");
  }

  async function removeMember(userId: number) {
    const next = currentMembers().map(m => m.id).filter(id => id !== userId);
    await save({ memberIds: next }, "members");
  }

  useEffect(() => {
    if (task) { setTitleVal(task.title); setDescVal(task.description ?? ""); setNoteHtml(task.note ?? ""); }
  }, [task?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const save = useCallback(async (data: Record<string, unknown>, field?: string) => {
    if (field) setSaving(field);
    await updateTask(data);
    onUpdate?.();
    setSaving(null);
  }, [updateTask, onUpdate]);

  async function saveTitle() {
    setEditTitle(false);
    const t = titleVal.trim();
    if (!t || t === task?.title) return;
    await save({ title: t }, "title");
  }

  async function saveDesc() {
    setEditDesc(false);
    const d = descVal.trim() || null;
    if (d === (task?.description ?? null)) return;
    await save({ description: d }, "desc");
  }

  function handleNoteChange(html: string) {
    setNoteHtml(html);
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      if (!taskUuid) return;
      try { await api.put(`/todo/tasks/${taskUuid}/note`, { content: html }); }
      catch { toast.error("Failed to save note"); }
    }, 1500);
  }

  async function handleToggle() { await toggleStatus(); refetch(); onUpdate?.(); }

  async function handleDuplicate() {
    if (!task?.listUuid) return;
    setDuplicating(true);
    try {
      await api.post(`/todo/lists/${task.listUuid}/tasks`, {
        title: `Copy of ${task.title}`, description: task.description ?? null,
        priority: task.priority, dueDate: task.dueDate ?? null, bgColor: task.bgColor ?? "default",
      });
      toast.success("Task duplicated"); onUpdate?.(); onClose();
    } catch { toast.error("Failed to duplicate task"); }
    finally { setDuplicating(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    const ok = await deleteTask();
    if (ok) { onClose(); onUpdate?.(); }
  }

  async function addSubtask() {
    const title = newSubtitle.trim();
    if (!title || !taskUuid) return;
    try { await api.post(`/todo/tasks/${taskUuid}/subtasks`, { title }); setNewSubtitle(""); refetch(); }
    catch { toast.error("Failed to add subtask"); }
  }

  async function toggleSubtask(sub: TodoSubtask) {
    if (!taskUuid) return;
    const newStatus = sub.status === "completed" ? "pending" : "completed";
    try { await api.patch(`/todo/tasks/${taskUuid}/subtasks/${sub.uuid}`, { status: newStatus }); refetch(); }
    catch { toast.error("Failed to update subtask"); }
  }

  async function deleteSubtask(sub: TodoSubtask) {
    if (!taskUuid) return;
    try { await api.delete(`/todo/tasks/${taskUuid}/subtasks/${sub.uuid}`); refetch(); }
    catch { toast.error("Failed to delete subtask"); }
  }

  async function updateSubtaskTitle(sub: TodoSubtask, title: string) {
    const t = title.trim();
    if (!t || t === sub.title || !taskUuid) return;
    try { await api.patch(`/todo/tasks/${taskUuid}/subtasks/${sub.uuid}`, { title: t }); refetch(); }
    catch { toast.error("Failed to update subtask"); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !taskUuid) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return; }
    const fd = new FormData(); fd.append("file", file);
    setUploading(true);
    try { await api.post(`/todo/tasks/${taskUuid}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } }); refetch(); toast.success("File attached"); }
    catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function deleteAttachment(att: TodoAttachment) {
    if (!taskUuid) return;
    try { await api.delete(`/todo/tasks/${taskUuid}/attachments/${att.uuid}`); refetch(); }
    catch { toast.error("Failed to delete attachment"); }
  }

  async function setQuickReminder(option: string) {
    if (!taskUuid) return;
    try { await api.patch(`/todo/tasks/${taskUuid}/reminder`, { quickOption: option }); refetch(); setReminderMode("hidden"); }
    catch { toast.error("Failed to set reminder"); }
  }

  async function setCustomReminderDate() {
    if (!taskUuid || !customReminder) return;
    try { await api.patch(`/todo/tasks/${taskUuid}/reminder`, { reminderAt: customReminder }); refetch(); setReminderMode("hidden"); setCustomReminder(""); }
    catch { toast.error("Failed to set reminder"); }
  }

  async function clearReminder() {
    if (!taskUuid) return;
    try { await api.delete(`/todo/tasks/${taskUuid}/reminder`); refetch(); }
    catch { toast.error("Failed to clear reminder"); }
  }

  if (!taskUuid) return null;

  const members = currentMembers();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden animate-slide-in-right"
        style={{ width: "min(520px, 100vw)", background: "var(--bg-surface)", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 40px rgba(0,0,0,.15)" }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Top action row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              {loading && <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />}
              {task?.listName && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: task.listColor ?? "#6366f1" }} />
                  <span className="truncate">{task.listName}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {task && (
                <button
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-40"
                >
                  {duplicating ? <Loader2 size={11} className="animate-spin" /> : <Copy size={11} />}
                  Duplicate
                </button>
              )}
              <button
                onClick={handleDelete}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={onClose}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Status + Title row */}
          <div className="flex items-start gap-3 mb-2">
            <button
              onClick={handleToggle}
              className="mt-0.5 shrink-0 transition-transform hover:scale-110"
            >
              {task?.status === "completed"
                ? <CheckCircle2 size={22} className="text-emerald-500" />
                : <Circle size={22} className="text-muted-foreground hover:text-primary" />
              }
            </button>
            <div className="flex-1 min-w-0">
              {editTitle ? (
                <input
                  autoFocus
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditTitle(false); setTitleVal(task!.title); } }}
                  className="w-full text-xl font-bold bg-transparent border-b-2 border-primary text-foreground outline-none pb-0.5"
                />
              ) : (
                <h2
                  onClick={() => setEditTitle(true)}
                  title="Click to edit"
                  className={`text-xl font-bold cursor-text leading-snug select-none ${task?.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {saving === "title" ? <span className="opacity-50">{task?.title}</span> : (task?.title ?? "…")}
                </h2>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="pl-9">
            {editDesc ? (
              <textarea
                autoFocus
                rows={2}
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={e => { if (e.key === "Escape") { setEditDesc(false); setDescVal(task?.description ?? ""); } }}
                placeholder="Add a description…"
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none leading-relaxed"
              />
            ) : (
              <p
                onClick={() => setEditDesc(true)}
                className="text-sm text-muted-foreground cursor-text hover:text-foreground/70 transition-colors min-h-[18px] leading-relaxed"
              >
                {task?.description || <span className="italic opacity-40">Add a description…</span>}
              </p>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && !task ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : task ? (
            <>
              {/* ── Property chips ── */}
              <div className="flex flex-wrap gap-2">

                {/* Priority */}
                <div className="relative inline-flex">
                  <select
                    value={task.priority}
                    onChange={e => save({ priority: e.target.value }, "priority")}
                    className="appearance-none pl-6 pr-5 py-1.5 rounded-full text-xs font-semibold cursor-pointer outline-none border transition-all"
                    style={{ background: PRIORITY_BG[task.priority], color: PRIORITY_COLORS[task.priority], borderColor: PRIORITY_BORDER[task.priority] }}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                  <Flag size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: PRIORITY_COLORS[task.priority] }} />
                  <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" style={{ color: PRIORITY_COLORS[task.priority] }} />
                </div>

                {/* Due Date */}
                <label className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all
                  ${task.dueDate ? "border-amber-500/25 bg-amber-500/10 text-amber-600" : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                  <Calendar size={11} />
                  {task.dueDate ? fmtDate(task.dueDate) : "Due date"}
                  {task.dueDate && <DueDateChip date={task.dueDate} showIcon={false} />}
                  <input type="date" value={task.dueDate ?? ""} onChange={e => save({ dueDate: e.target.value || null }, "dueDate")} className="sr-only" />
                </label>

                {/* List */}
                <div className="relative inline-flex">
                  <select
                    value={task.listUuid ?? ""}
                    onChange={e => { if (e.target.value) save({ listId: e.target.value }, "list"); }}
                    className="appearance-none pl-2.5 pr-5 py-1.5 rounded-full text-xs font-medium cursor-pointer outline-none border border-border/70 bg-muted/40 text-foreground hover:border-primary/40 transition-all"
                  >
                    {task.listName && <option value={task.listUuid ?? ""}>{task.listName}</option>}
                    {lists.filter(l => l.uuid !== task.listUuid).map(l => <option key={l.uuid} value={l.uuid}>{l.name}</option>)}
                  </select>
                  <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>

                {/* Repeat */}
                <div className="relative inline-flex">
                  <select
                    value={task.repeatType ?? "none"}
                    onChange={e => save({ repeatType: e.target.value }, "repeat")}
                    className={`appearance-none pl-6 pr-5 py-1.5 rounded-full text-xs font-medium cursor-pointer outline-none border transition-all
                      ${task.repeatType && task.repeatType !== "none"
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                  >
                    {REPEAT_TYPES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <RefreshCw size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: task.repeatType && task.repeatType !== "none" ? "var(--primary)" : "#9CA3AF" }} />
                  <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>

                {/* Color swatches */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/70 bg-muted/40">
                  {BG_COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => save({ bgColor: opt.value }, "bgColor")}
                      title={opt.label}
                      className="w-3.5 h-3.5 rounded-full border-2 transition-all hover:scale-125"
                      style={{ background: opt.hex === "transparent" ? "var(--bg-elevated)" : opt.hex, borderColor: task.bgColor === opt.value ? "var(--accent)" : "transparent" }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Assignees ── */}
              <div>
                <SectionLabel>Assigned To</SectionLabel>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {members.length > 0 && (
                    <div className="flex -space-x-2">
                      {members.slice(0, 5).map(m => {
                        const photoSrc = resolveAssetUrl(m.avatarUrl);
                        return (
                          <div
                            key={m.id}
                            title={m.name}
                            className={`relative w-8 h-8 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-pointer group/av ${!photoSrc ? nameColor(m.name) : ""}`}
                          >
                            {photoSrc
                              ? <img src={photoSrc} alt={m.name} className="w-full h-full rounded-full object-cover" />
                              : initials(m.name)
                            }
                            <button
                              onClick={() => removeMember(m.id)}
                              className="absolute inset-0 rounded-full bg-red-500/80 text-white opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        );
                      })}
                      {members.length > 5 && (
                        <div className="w-8 h-8 rounded-full ring-2 ring-card bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative" ref={memberPickerRef}>
                    <button
                      onClick={() => setMemberPickerOpen(v => !v)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-all
                        ${members.length === 0
                          ? "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                          : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                    >
                      <Plus size={11} />
                      {members.length === 0 ? "Assign to…" : "Add"}
                    </button>

                    {memberPickerOpen && (
                      <div className="absolute left-0 top-10 z-50 w-60 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                        <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assign to</p>
                        </div>
                        <div className="py-1 max-h-52 overflow-y-auto">
                          {users.filter(u => !members.some(m => m.id === u.id)).length === 0 ? (
                            <p className="px-3 py-3 text-xs text-muted-foreground text-center">All members assigned</p>
                          ) : (
                            users.filter(u => !members.some(m => m.id === u.id)).map(u => {
                              const photoSrc = resolveAssetUrl(u.avatarUrl);
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => addMember(u.id)}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-muted/60 text-left transition-colors"
                                >
                                  {photoSrc
                                    ? <img src={photoSrc} alt={u.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                    : <span className={`w-7 h-7 rounded-full ${nameColor(u.name)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>{initials(u.name)}</span>
                                  }
                                  <span className="text-sm font-medium text-foreground truncate">{u.name}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => (
                        <span key={m.id} className="text-xs text-muted-foreground">{m.name}{members.indexOf(m) < members.length - 1 ? "," : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Reminder ── */}
              <div>
                <SectionLabel icon={<Bell size={12} />}>Reminder</SectionLabel>
                {task.reminderAt ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-2.5">
                      <Bell size={14} className="text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {new Date(task.reminderAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <button onClick={clearReminder} className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                      <BellOff size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {reminderMode === "hidden" && (
                      <button
                        onClick={() => setReminderMode("quick")}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-dashed border-border hover:border-primary/40"
                      >
                        <Bell size={11} /> Set reminder
                      </button>
                    )}
                    {reminderMode === "quick" && (
                      <div className="flex flex-wrap gap-2">
                        {[{ label: "Later today", value: "later_today" }, { label: "Tomorrow", value: "tomorrow" }, { label: "Next week", value: "next_week" }].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setQuickReminder(opt.value)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/70 bg-muted/40 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                          >
                            {opt.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setReminderMode("custom")}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border hover:border-primary/40 hover:text-primary transition-all"
                        >
                          Pick date…
                        </button>
                        <button onClick={() => setReminderMode("hidden")} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
                          Cancel
                        </button>
                      </div>
                    )}
                    {reminderMode === "custom" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={customReminder}
                          onChange={e => setCustomReminder(e.target.value)}
                          className="flex-1 h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                        <button
                          onClick={setCustomReminderDate}
                          disabled={!customReminder}
                          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/85 transition-colors"
                        >
                          Set
                        </button>
                        <button onClick={() => setReminderMode("hidden")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Subtasks ── */}
              <div>
                <SectionLabel>
                  {`Subtasks${task.subtasks?.length ? ` · ${task.subtasks.filter(s => s.status === "completed").length}/${task.subtasks.length}` : ""}`}
                </SectionLabel>
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mb-3">
                    <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(task.subtasks.filter(s => s.status === "completed").length / task.subtasks.length) * 100}%` }}
                      />
                    </div>
                    <div className="space-y-0.5">
                      {task.subtasks.map(sub => (
                        <SubtaskRow
                          key={sub.uuid}
                          sub={sub}
                          onToggle={() => toggleSubtask(sub)}
                          onDelete={() => deleteSubtask(sub)}
                          onRename={title => updateSubtaskTitle(sub, title)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={newSubtitle}
                    onChange={e => setNewSubtitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(); }}
                    placeholder="Add a subtask…"
                    className="flex-1 h-9 rounded-xl border border-border/70 bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  />
                  <button
                    onClick={addSubtask}
                    disabled={!newSubtitle.trim()}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/85 transition-colors shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Notes ── */}
              <div>
                <SectionLabel>Notes</SectionLabel>
                <RichTextEditor value={noteHtml} onChange={handleNoteChange} editable={true} placeholder="Add notes…" />
              </div>

              {/* ── Attachments ── */}
              <div>
                <SectionLabel>{`Attachments${task.attachments?.length ? ` · ${task.attachments.length}` : ""}`}</SectionLabel>
                {task.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {task.attachments.map(att => (
                      <AttachmentRow key={att.uuid} att={att} taskUuid={task.uuid} onDelete={() => deleteAttachment(att)} />
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.zip" onChange={handleFileUpload} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 px-3 py-1.5 rounded-full transition-all disabled:opacity-40"
                >
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                  {uploading ? "Uploading…" : "Attach file"}
                </button>
              </div>

              {/* bottom padding */}
              <div className="h-4" />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-xs font-semibold text-muted-foreground">{children}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function SubtaskRow({
  sub, onToggle, onDelete, onRename,
}: { sub: TodoSubtask; onToggle: () => void; onDelete: () => void; onRename: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(sub.title);
  const done = sub.status === "completed";

  return (
    <div className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
      <button onClick={onToggle} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
        {done ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Circle size={15} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onRename(val); setEditing(false); }}
          onKeyDown={e => { if (e.key === "Enter") { onRename(val); setEditing(false); } if (e.key === "Escape") { setVal(sub.title); setEditing(false); } }}
          className="flex-1 bg-transparent border-b border-primary text-sm text-foreground outline-none"
        />
      ) : (
        <span
          className={`flex-1 text-sm cursor-text ${done ? "line-through text-muted-foreground" : "text-foreground"}`}
          onClick={() => setEditing(true)}
        >
          {sub.title}
        </span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0 p-0.5 rounded"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function AttachmentRow({
  att, taskUuid, onDelete,
}: { att: TodoAttachment; taskUuid: string; onDelete: () => void }) {
  const apiBase    = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000/api";
  const downloadUrl = `${apiBase}/todo/tasks/${taskUuid}/attachments/${att.uuid}/download`;
  const ext        = att.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
  const size       = att.fileSize < 1024 * 1024
    ? `${Math.round(att.fileSize / 1024)} KB`
    : `${(att.fileSize / 1024 / 1024).toFixed(1)} MB`;

  const EXT_COLORS: Record<string, string> = {
    PDF: "bg-red-500/10 text-red-600", DOCX: "bg-blue-500/10 text-blue-600",
    XLSX: "bg-green-500/10 text-green-600", PNG: "bg-purple-500/10 text-purple-600",
    JPG: "bg-amber-500/10 text-amber-600", JPEG: "bg-amber-500/10 text-amber-600",
    ZIP: "bg-gray-500/10 text-gray-600",
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors">
      <span className={`text-[10px] font-bold rounded-lg px-1.5 py-1 shrink-0 ${EXT_COLORS[ext] ?? "bg-muted text-muted-foreground"}`}>
        {ext}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate block">{att.fileName}</span>
        <span className="text-[11px] text-muted-foreground">{size}</span>
      </div>
      <a href={downloadUrl} download className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1.5 rounded-lg hover:bg-primary/10">
        <Download size={13} />
      </a>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0 p-1.5 rounded-lg hover:bg-red-500/10">
        <X size={12} />
      </button>
    </div>
  );
}
