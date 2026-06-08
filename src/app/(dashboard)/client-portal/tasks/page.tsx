"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { ClientTaskDetailPanel } from "@/components/modules/tasks/ClientTaskDetailPanel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, MessageSquare, Paperclip, LayoutGrid, List,
  CircleDot, Zap, Eye, CheckCircle2, AlarmClock, Clock, X, Plus,
} from "lucide-react";

// ─── Column Config ─────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id: "TODO",        label: "To Do",       icon: CircleDot,
    accent:    "#94a3b8",
    headerBg:  "linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(148,163,184,0.03) 100%)",
    zoneBg:    "rgba(148,163,184,0.025)",
  },
  {
    id: "IN_PROGRESS", label: "In Progress", icon: Zap,
    accent:    "#6366f1",
    headerBg:  "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
    zoneBg:    "rgba(99,102,241,0.025)",
  },
  {
    id: "IN_REVIEW",   label: "In Review",   icon: Eye,
    accent:    "#f59e0b",
    headerBg:  "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.03) 100%)",
    zoneBg:    "rgba(245,158,11,0.025)",
  },
  {
    id: "DONE",        label: "Done",        icon: CheckCircle2,
    accent:    "#22c55e",
    headerBg:  "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 100%)",
    zoneBg:    "rgba(34,197,94,0.02)",
  },
] as const;

// ─── Priority Config ───────────────────────────────────────────────────────────

const PRI_CFG: Record<string, { accent: string; bg: string; border: string; label: string }> = {
  URGENT: { accent: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  label: "Urgent" },
  HIGH:   { accent: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", label: "High"   },
  MEDIUM: { accent: "#6366f1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", label: "Medium" },
  LOW:    { accent: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)",  label: "Low"    },
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TaskService {
  id: number;
  label: string;
  color: string;
}

interface Task {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  commentCount: number;
  attachmentCount: number;
  subTaskCount?: number;
  subTasksDone?: number;
  service?: TaskService | null;
}

// ─── Due Date Helper ───────────────────────────────────────────────────────────

function dueMeta(iso: string, done: boolean) {
  if (done) return {
    label: new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    color: "var(--muted-foreground)", bg: "transparent", border: "transparent", icon: null as "alarm" | "clock" | null,
  };
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date();    t.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - t.getTime()) / 86_400_000);
  const label = diff === 0 ? "Today"
    : diff === 1  ? "Tomorrow"
    : diff === -1 ? "Yesterday"
    : new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  if (diff < 0)  return { label, color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.40)",   icon: "alarm" as const };
  if (diff <= 2) return { label, color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)",  icon: "clock" as const };
  return              { label, color: "#6366f1", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.25)",  icon: "clock" as const };
}

// ─── Priority Badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRI_CFG[priority] ?? PRI_CFG["MEDIUM"];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border"
      style={{ background: cfg.bg, color: cfg.accent, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.accent }} />
      {cfg.label}
    </span>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isDone = task.status === "DONE";
  const pri    = PRI_CFG[task.priority] ?? PRI_CFG["MEDIUM"];
  const dm     = task.dueDate ? dueMeta(task.dueDate, isDone) : null;

  return (
    <div
      onClick={onClick}
      className={`group relative select-none rounded-2xl border transition-all duration-200 cursor-pointer
        hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10
        ${isDone ? "opacity-60" : ""}`}
      style={{
        background:      "var(--card)",
        borderColor:     "var(--border)",
        borderLeftWidth: "3px",
        borderLeftColor: pri.accent,
      }}
    >
      {!isDone && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 20px ${pri.bg}` }}
        />
      )}

      <div className="px-3.5 pt-3 pb-0">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="px-3.5 pt-2 pb-2.5">
        <p className={`text-sm font-semibold leading-snug line-clamp-2 tracking-[-0.01em]
          ${isDone ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
        {task.service && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
            style={{
              background:   `${task.service.color}18`,
              color:        task.service.color,
              borderColor:  `${task.service.color}35`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.service.color }} />
            {task.service.label}
          </span>
        )}
      </div>

      {/* Subtask progress */}
      {(task.subTaskCount ?? 0) > 0 && (() => {
        const total = task.subTaskCount!;
        const done  = task.subTasksDone ?? 0;
        return (
          <div className="px-3.5 pb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground/60 font-medium">Subtasks</span>
              <span className="text-[10px] font-bold" style={{ color: pri.accent }}>{done}/{total}</span>
            </div>
            <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ background: pri.accent, width: `${Math.round((done / total) * 100)}%` }}
              />
            </div>
          </div>
        );
      })()}

      {(task.assigneeName || dm || task.commentCount > 0 || task.attachmentCount > 0) && (
        <div className="flex items-center justify-between px-3.5 pb-3 pt-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.assigneeName && (
              <span className="text-[11px] text-muted-foreground/70 truncate">
                {task.assigneeName.split(" ")[0]}
              </span>
            )}
            {task.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
                <Paperclip size={9} /> {task.attachmentCount}
              </span>
            )}
            {task.commentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
                <MessageSquare size={9} /> {task.commentCount}
              </span>
            )}
          </div>
          {dm && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0"
              style={{ background: dm.bg, color: dm.color, borderColor: dm.border }}
            >
              {dm.icon === "alarm" ? <AlarmClock size={9} /> : dm.icon === "clock" ? <Clock size={9} /> : null}
              {dm.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ title, icon: Icon, tasks, accent, headerBg, zoneBg, onTaskClick }: {
  title: string; icon: React.ElementType; tasks: Task[];
  accent: string; headerBg: string; zoneBg: string;
  onTaskClick: (task: Task) => void;
}) {
  return (
    <div className="flex flex-col w-[290px] shrink-0 min-h-0">
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-t-2xl"
        style={{ background: headerBg, borderTop: `2px solid ${accent}50` }}
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18`, boxShadow: `0 2px 8px ${accent}20` }}
        >
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span className="text-sm font-semibold text-foreground/90">{title}</span>
        {tasks.length > 0 && (
          <span
            className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center tabular-nums ml-auto"
            style={{ background: `${accent}20`, color: accent }}
          >
            {tasks.length}
          </span>
        )}
      </div>

      <div
        className="flex-1 space-y-2.5 p-3 rounded-b-2xl overflow-y-auto"
        style={{ background: zoneBg, border: `1px solid ${accent}15`, borderTop: "none", minHeight: "120px" }}
      >
        {tasks.map(t => <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />)}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}12` }}>
              <Icon size={18} style={{ color: `${accent}55` }} />
            </div>
            <p className="text-[11px] text-muted-foreground/40 text-center">No tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/tasks", {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
      });
      onCreated();
      onClose();
    } catch {
      setError("Failed to create task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>New Task</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter task title…"
              className="w-full h-9 rounded-xl border border-border/50 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select value={priority} onValueChange={v => v && setPriority(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-border/50 bg-muted/30">
                  <SelectValue>{(v: string) => PRI_CFG[v]?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p} className="text-xs">{PRI_CFG[p]?.label ?? p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-border/50 bg-muted/30 px-3 text-sm text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:bg-muted/30 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {saving ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClientPortalTasksPage() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("ALL");
  const [priority, setPriority]   = useState("ALL");
  const [overdue, setOverdue]     = useState(false);
  const [viewMode, setViewMode]   = useState<"kanban" | "list">("kanban");
  const [addOpen, setAddOpen]     = useState(false);
  const [editUuid, setEditUuid]   = useState<string | null>(null);

  const hasFilters = !!(search || status !== "ALL" || priority !== "ALL" || overdue);

  function clearFilters() { setSearch(""); setStatus("ALL"); setPriority("ALL"); setOverdue(false); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)             params["search"]   = search;
      if (status !== "ALL")   params["status"]   = status;
      if (priority !== "ALL") params["priority"] = priority;
      if (overdue)            params["overdue"]  = "true";
      const r = await api.get("/client-portal/tasks", { params });
      setTasks(r.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, [search, status, priority, overdue]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const byStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2.5 pb-5 shrink-0">

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-8 h-9 w-52 rounded-xl border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={status} onValueChange={v => setStatus(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-[170px] text-xs rounded-xl border-border/50 bg-muted/30 gap-1.5">
            <span className="text-muted-foreground shrink-0">Status:</span>
            <SelectValue>{(v: string) => v && v !== "ALL" ? (COLUMNS.find(c => c.id === v)?.label ?? v) : "All"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL" className="text-xs">All</SelectItem>
            {COLUMNS.map(col => (
              <SelectItem key={col.id} value={col.id} className="text-xs">{col.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={priority} onValueChange={v => setPriority(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-[170px] text-xs rounded-xl border-border/50 bg-muted/30 gap-1.5">
            <span className="text-muted-foreground shrink-0">Priority:</span>
            <SelectValue>{(v: string) => v && v !== "ALL" ? v.charAt(0) + v.slice(1).toLowerCase() : "All"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL" className="text-xs">All</SelectItem>
            {PRIORITIES.map(p => (
              <SelectItem key={p} value={p} className="text-xs">{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Overdue filter */}
        <button
          onClick={() => setOverdue(v => !v)}
          className={`h-9 px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5
            ${overdue
              ? "bg-red-500/12 border-red-500/40 text-red-400 hover:bg-red-500/18"
              : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          <AlarmClock size={13} /> Overdue
        </button>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-9 px-3 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-1.5"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* New Task button */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-lg hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
        >
          <Plus size={15} /> New Task
        </button>

        {/* View toggle — pushed to the right */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-xl p-1 border border-border/40 ml-auto">
          {([
            { v: "kanban" as const, icon: LayoutGrid, label: "Board" },
            { v: "list"   as const, icon: List,       label: "List"  },
          ] as const).map(({ v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                ${viewMode === v
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Task count pills */}
        {!loading && tasks.length > 0 && (
          <div className="flex items-center gap-2">
            {COLUMNS.map(col => {
              const count = byStatus(col.id).length;
              if (count === 0) return null;
              return (
                <span
                  key={col.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border"
                  style={{ background: `${col.accent}10`, color: col.accent, borderColor: `${col.accent}25` }}
                >
                  {count} {col.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm">Loading tasks…</span>
          </div>
        </div>
      )}

      {/* ── Kanban Board ── */}
      {!loading && viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-0 animate-fade-in">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              title={col.label}
              icon={col.icon}
              tasks={byStatus(col.id)}
              accent={col.accent}
              headerBg={col.headerBg}
              zoneBg={col.zoneBg}
              onTaskClick={t => setEditUuid(t.uuid)}
            />
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {!loading && viewMode === "list" && (
        <div className="animate-fade-in flex-1 rounded-2xl border border-border overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60" style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Task", "Service", "Status", "Priority", "Assignee", "Due Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                          <Search size={20} className="opacity-30" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">No tasks found</p>
                          <p className="text-xs mt-0.5 opacity-60">Try adjusting filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((t, i) => {
                    const col    = COLUMNS.find(c => c.id === t.status);
                    const isDone = t.status === "DONE";
                    const pri    = PRI_CFG[t.priority] ?? PRI_CFG["MEDIUM"];
                    const dm     = t.dueDate ? dueMeta(t.dueDate, isDone) : null;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setEditUuid(t.uuid)}
                        className={`border-b border-border/30 last:border-0 transition-colors cursor-pointer ${isDone ? "opacity-60" : ""}`}
                        style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.04)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                      >
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-1 h-8 rounded-full shrink-0" style={{ background: pri.accent }} />
                            <p className={`font-semibold text-sm truncate ${isDone ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                              {t.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {t.service ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border"
                              style={{ background: `${t.service.color}18`, color: t.service.color, borderColor: `${t.service.color}35` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.service.color }} />
                              {t.service.label}
                            </span>
                          ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {col && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border"
                              style={{ background: `${col.accent}10`, color: col.accent, borderColor: `${col.accent}25` }}
                            >
                              <col.icon size={9} /> {col.label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {t.assigneeName ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {dm
                            ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ background: dm.bg, color: dm.color }}>
                                {dm.icon === "alarm" ? <AlarmClock size={9} /> : dm.icon === "clock" ? <Clock size={9} /> : null}
                                {dm.label}
                              </span>
                            : <span className="text-muted-foreground/40 text-xs">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {addOpen && (
        <AddTaskModal
          onClose={() => setAddOpen(false)}
          onCreated={load}
        />
      )}

      <ClientTaskDetailPanel
        uuid={editUuid}
        onClose={() => setEditUuid(null)}
        onUpdated={load}
      />
    </div>
  );
}
