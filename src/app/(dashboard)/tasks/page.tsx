"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from "@hello-pangea/dnd";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { AddTaskModal } from "@/components/modules/tasks/AddTaskModal";
import { TaskDetailPanel } from "@/components/modules/tasks/TaskDetailPanel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Clock, Paperclip, MessageCircle, Search,
  X, LayoutGrid, List, CircleDot, Zap, Eye, CheckCircle2,
  AlarmClock, Copy, Trash2, MoreHorizontal, ChevronRight,
} from "lucide-react";
import type { Task, User, Client, ApiResponse } from "@/types";

// ── Column config ──────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id:       "TODO"        as const,
    label:    "To Do",
    icon:     CircleDot,
    accent:   "#94a3b8",
    glow:     "rgba(148,163,184,0.10)",
    headerBg: "linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(148,163,184,0.03) 100%)",
    zoneBg:   "rgba(148,163,184,0.025)",
    overBg:   "rgba(148,163,184,0.06)",
    pillCls:  "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  {
    id:       "IN_PROGRESS" as const,
    label:    "In Progress",
    icon:     Zap,
    accent:   "#6366f1",
    glow:     "rgba(99,102,241,0.12)",
    headerBg: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
    zoneBg:   "rgba(99,102,241,0.025)",
    overBg:   "rgba(99,102,241,0.06)",
    pillCls:  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  {
    id:       "IN_REVIEW"   as const,
    label:    "In Review",
    icon:     Eye,
    accent:   "#f59e0b",
    glow:     "rgba(245,158,11,0.10)",
    headerBg: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.03) 100%)",
    zoneBg:   "rgba(245,158,11,0.025)",
    overBg:   "rgba(245,158,11,0.05)",
    pillCls:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    id:       "DONE"        as const,
    label:    "Done",
    icon:     CheckCircle2,
    accent:   "#22c55e",
    glow:     "rgba(34,197,94,0.10)",
    headerBg: "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 100%)",
    zoneBg:   "rgba(34,197,94,0.02)",
    overBg:   "rgba(34,197,94,0.05)",
    pillCls:  "bg-green-500/10 text-green-400 border-green-500/20",
  },
] as const;

// ── Priority config ────────────────────────────────────────────────────────────

const PRI_CFG: Record<string, { accent: string; bg: string; border: string; label: string }> = {
  URGENT: { accent: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  label: "Urgent" },
  HIGH:   { accent: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", label: "High"   },
  MEDIUM: { accent: "#6366f1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", label: "Medium" },
  LOW:    { accent: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)",  label: "Low"    },
};

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#f97316","#14b8a6","#a855f7","#3b82f6","#ec4899","#f59e0b","#06b6d4","#f43f5e",
];

function nameColor(name: string) {
  return AVATAR_PALETTE[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function dueMeta(iso: string, done: boolean): { label: string; color: string; bg: string; icon: "alarm" | "clock" | null } {
  if (done) return { label: new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.04)", icon: null };
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date();    t.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - t.getTime()) / 86_400_000);
  const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday"
    : new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  if (diff < 0)  return { label, color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "alarm" };
  if (diff <= 2) return { label, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "clock" };
  return { label, color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.04)", icon: null };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserAvatar({ name, url, size = "md" }: { name?: string | null; url?: string | null; size?: "sm" | "md" | "lg" }) {
  const [err, setErr] = useState(false);
  if (!name) return null;
  const cls = size === "sm" ? "w-6 h-6 text-[9px]" : size === "lg" ? "w-8 h-8 text-[11px]" : "w-7 h-7 text-[10px]";
  const src = resolveAssetUrl(url);
  if (src && !err) return (
    <img src={src} alt={name} title={name} onError={() => setErr(true)}
      className={`${cls} rounded-full object-cover ring-2 ring-card flex-shrink-0`} />
  );
  return (
    <div title={name} className={`${cls} rounded-full text-white flex items-center justify-center font-bold ring-2 ring-card flex-shrink-0`}
      style={{ background: nameColor(name) }}>
      {initials(name)}
    </div>
  );
}

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

// ── Kanban card ────────────────────────────────────────────────────────────────

function KanbanCard({
  task, index, isDone, isAdmin, canDelete, onOpen, onRefresh,
}: {
  task:      Task;
  index:     number;
  isDone:    boolean;
  isAdmin:   boolean;
  canDelete: boolean;
  onOpen:    () => void;
  onRefresh: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pri     = PRI_CFG[task.priority] ?? PRI_CFG["MEDIUM"];

  const subCount     = task._count?.subTasks   ?? 0;
  const attachCount  = task._count?.attachments ?? 0;
  const commentCount = task._count?.comments   ?? 0;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  async function duplicate(e: React.MouseEvent) {
    e.stopPropagation(); setMenuOpen(false);
    try {
      await api.post("/tasks", {
        title:     `Copy of ${task.title}`,
        description: task.description ?? null,
        status:    "TODO",
        priority:  task.priority,
        dueDate:   task.dueDate ?? null,
        clientId:  task.clientId ?? null,
        memberIds: task.members?.map(m => m.id) ?? (task.assignedToId ? [task.assignedToId] : []),
      });
      onRefresh();
    } catch { /* ignore */ }
  }

  async function remove(e: React.MouseEvent) {
    e.stopPropagation(); setMenuOpen(false);
    if (!confirm(`Delete "${task.title}"?`)) return;
    try { await api.delete(`/tasks/${task.uuid}`); onRefresh(); }
    catch { /* ignore */ }
  }

  const members = task.members?.length ? task.members : task.assignedTo ? [task.assignedTo] : [];
  const dm      = task.dueDate ? dueMeta(task.dueDate, isDone) : null;

  return (
    <Draggable draggableId={task.uuid} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onOpen}
          className={`group relative cursor-pointer select-none rounded-2xl border transition-all duration-200
            ${snapshot.isDragging
              ? "shadow-2xl shadow-black/25 scale-[1.03] rotate-[0.8deg]"
              : "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10"
            }
            ${isDone ? "opacity-60" : ""}`}
          style={{
            ...provided.draggableProps.style,
            background:      "var(--card)",
            borderColor:     snapshot.isDragging ? pri.accent : "var(--border)",
            borderLeftWidth: "3px",
            borderLeftColor: pri.accent,
            boxShadow:       snapshot.isDragging
              ? `0 20px 40px rgba(0,0,0,0.25), 0 0 0 1px ${pri.accent}40`
              : undefined,
          }}
        >
          {/* Subtle glow on hover */}
          {!isDone && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: `inset 0 0 20px ${pri.bg}` }}
            />
          )}

          {/* Top: priority badge + menu */}
          <div className="flex items-center justify-between px-3.5 pt-3 pb-0">
            <PriorityBadge priority={task.priority} />
            {isAdmin && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted/60 hover:text-foreground transition-all"
                >
                  <MoreHorizontal size={13} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
                    <div className="absolute right-0 top-8 z-50 min-w-[160px] bg-card rounded-xl border border-border shadow-2xl shadow-black/20 py-1.5">
                      <button onClick={duplicate} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground/80 hover:bg-muted/60 hover:text-foreground text-left transition-colors">
                        <Copy size={12} /> Duplicate
                      </button>
                      {canDelete && (
                        <>
                          <div className="my-1.5 mx-3 border-t border-border/60" />
                          <button onClick={remove} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/8 text-left transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="px-3.5 pt-2 pb-2.5">
            <p className={`text-sm font-semibold leading-snug line-clamp-2 tracking-[-0.01em]
              ${isDone ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
              {task.title}
            </p>
            {task.client && (
              <p className="text-[11px] font-semibold mt-1" style={{ color: "#6366f1" }}>
                {task.client.companyName}
              </p>
            )}
          </div>

          {/* Member avatars */}
          {members.length > 0 && (
            <div className="px-3.5 pb-2.5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {members.slice(0, 4).map(m => (
                  <UserAvatar key={m.id} name={m.name} url={m.avatarUrl} size="sm" />
                ))}
              </div>
              {members.length > 4 && (
                <span className="text-[10px] text-muted-foreground font-medium">+{members.length - 4}</span>
              )}
              {!isDone && (
                <span className="text-[11px] text-muted-foreground/50 ml-0.5">
                  {members[0].name.split(" ")[0]}{members.length > 1 ? ` +${members.length - 1}` : ""}
                </span>
              )}
            </div>
          )}

          {/* Subtask progress */}
          {subCount > 0 && (
            <div className="px-3.5 pb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground/60 font-medium">Subtasks</span>
                <span className="text-[10px] font-bold" style={{ color: pri.accent }}>{subCount}</span>
              </div>
              <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full w-0 rounded-full transition-all" style={{ background: pri.accent }} />
              </div>
            </div>
          )}

          {/* Footer chips */}
          {(dm || attachCount > 0 || commentCount > 0) && (
            <div className="flex items-center gap-1.5 px-3.5 pb-3 pt-0 flex-wrap">
              {dm && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: dm.bg, color: dm.color }}
                >
                  {dm.icon === "alarm" ? <AlarmClock size={9} /> : dm.icon === "clock" ? <Clock size={9} /> : <Clock size={9} />}
                  {dm.label}
                </span>
              )}
              {attachCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
                  <Paperclip size={9} /> {attachCount}
                </span>
              )}
              {commentCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
                  <MessageCircle size={9} /> {commentCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [view,            setView]            = useState<"kanban" | "list">("kanban");
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatus]          = useState("ALL");
  const [priorityFilter,  setPriority]        = useState("ALL");
  const [assigneeFilter,  setAssignee]        = useState("ALL");
  const [clientFilter,    setClient]          = useState(() => searchParams.get("clientId") ?? "ALL");
  const [addOpen,         setAddOpen]         = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState("TODO");
  const [detailUuid,      setDetailUuid]      = useState<string | null>(null);
  const [users,           setUsers]           = useState<User[]>([]);
  const [clients,         setClients]         = useState<Client[]>([]);
  const [memberDropOpen,  setMemberDropOpen]  = useState(false);
  const memberRef = useRef<HTMLDivElement>(null);

  const isAdmin  = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD", "HR"].includes(user?.role ?? "");
  const canDelete = ["SUPER_ADMIN", "ADMIN"].includes(user?.role ?? "");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)                   params["search"]       = search;
      if (statusFilter !== "ALL")   params["status"]       = statusFilter;
      if (priorityFilter !== "ALL") params["priority"]     = priorityFilter;
      if (assigneeFilter !== "ALL") params["assignedToId"] = assigneeFilter;
      if (clientFilter !== "ALL")   params["clientId"]     = clientFilter;
      const res = await api.get<ApiResponse<Task[]>>("/tasks", { params });
      setTasks(res.data.data);
    } catch { setTasks([]); }
    finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter, assigneeFilter, clientFilter]);

  useEffect(() => {
    const t = setTimeout(fetchTasks, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchTasks, search]);

  useEffect(() => {
    if (isAdmin) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } })
        .then(r => setUsers(r.data.data)).catch(() => {});
      api.get<ApiResponse<Client[]>>("/clients")
        .then(r => setClients(r.data.data)).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberDropOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const task = tasks.find(t => t.uuid === draggableId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t.uuid === draggableId ? { ...t, status: newStatus } : t));
    try { await api.patch(`/tasks/${draggableId}/status`, { status: newStatus }); }
    catch { setTasks(prev => prev.map(t => t.uuid === draggableId ? { ...t, status: task.status } : t)); }
  }

  function openAdd(status = "TODO") { setAddDefaultStatus(status); setAddOpen(true); }

  const tasksByStatus = (status: string) =>
    tasks.filter(t => t.status === status)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const selectedAssignee = users.find(u => String(u.id) === assigneeFilter);

  const hasFilters = !!(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || assigneeFilter !== "ALL" || clientFilter !== "ALL");

  const doneCount    = tasks.filter(t => t.status === "DONE").length;
  const activeCount  = tasks.filter(t => t.status !== "DONE").length;

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ══════════════ PAGE HEADER ══════════════ */}
      <div className="flex items-center justify-between shrink-0 pb-5">
        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-xl p-1 border border-border/40">
            {([
              { v: "kanban" as const, icon: LayoutGrid, label: "Board"  },
              { v: "list"   as const, icon: List,        label: "List"   },
            ] as const).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                  ${view === v
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => openAdd()}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-lg hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
        >
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* ══════════════ FILTER BAR ══════════════ */}
      <div className="flex items-center gap-2.5 pb-5 shrink-0 flex-wrap">

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

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={v => setPriority(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-[170px] text-xs rounded-xl border-border/50 bg-muted/30 gap-1.5">
            <span className="text-muted-foreground shrink-0">Priority:</span>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL" className="text-xs">All</SelectItem>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => (
              <SelectItem key={p} value={p} className="text-xs">{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client filter */}
        {isAdmin && clients.length > 0 && (
          <Select value={clientFilter} onValueChange={v => setClient(v ?? "ALL")}>
            <SelectTrigger className="h-9 w-[180px] text-xs rounded-xl border-border/50 bg-muted/30">
              <span className="text-muted-foreground mr-1 shrink-0">Client:</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs">All</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.companyName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Member filter */}
        {isAdmin && (
          <div className="relative" ref={memberRef}>
            {selectedAssignee ? (
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-primary/40 bg-primary/8 text-xs font-medium text-primary">
                <UserAvatar name={selectedAssignee.name} url={selectedAssignee.avatarUrl} size="sm" />
                <span>{selectedAssignee.name.split(" ")[0]}</span>
                <button onClick={() => setAssignee("ALL")} className="text-primary/60 hover:text-primary transition-colors ml-0.5">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMemberDropOpen(v => !v)}
                className="h-9 px-3 rounded-xl border border-border/50 bg-muted/30 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all flex items-center gap-1.5"
              >
                <Search size={12} /> Assignee
              </button>
            )}
            {memberDropOpen && users.length > 0 && (
              <div className="absolute top-11 left-0 z-50 w-56 bg-card rounded-2xl border border-border shadow-2xl shadow-black/20 py-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-2">Filter by member</p>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setAssignee(String(u.id)); setMemberDropOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-xs transition-colors text-left
                      ${String(u.id) === assigneeFilter ? "bg-primary/8 text-primary" : "hover:bg-muted/50 text-foreground"}`}
                  >
                    <UserAvatar name={u.name} url={u.avatarUrl} size="sm" />
                    <span className="font-medium">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatus("ALL"); setPriority("ALL"); setAssignee("ALL"); setClient("ALL"); }}
            className="h-9 px-3 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-1.5"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* Task count pills */}
        <div className="ml-auto flex items-center gap-2">
          {COLUMNS.map(col => {
            const count = tasksByStatus(col.id).length;
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
      </div>

      {/* ══════════════ KANBAN BOARD ══════════════ */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-0 animate-fade-in">
            {COLUMNS.map(col => {
              const colTasks = tasksByStatus(col.id);
              const Icon     = col.icon;

              return (
                <div key={col.id} className="flex flex-col w-[290px] shrink-0 min-h-0">

                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
                    style={{ background: col.headerBg, borderTop: `2px solid ${col.accent}50` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: `${col.accent}18`, boxShadow: `0 2px 8px ${col.accent}20` }}
                      >
                        <Icon size={13} style={{ color: col.accent }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground/90">{col.label}</span>
                      {colTasks.length > 0 && (
                        <span
                          className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center tabular-nums"
                          style={{ background: `${col.accent}20`, color: col.accent }}
                        >
                          {colTasks.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openAdd(col.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: `${col.accent}99` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${col.accent}15`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 space-y-2.5 p-3 rounded-b-2xl transition-all duration-150 overflow-y-auto"
                        style={{
                          background:   snapshot.isDraggingOver ? col.overBg : col.zoneBg,
                          border:       `1px solid ${col.accent}${snapshot.isDraggingOver ? "30" : "15"}`,
                          borderTop:    "none",
                          minHeight:    "120px",
                          boxShadow:    snapshot.isDraggingOver
                            ? `inset 0 0 0 2px ${col.accent}25, 0 0 20px ${col.glow}`
                            : "none",
                        }}
                      >
                        {/* Loading skeletons */}
                        {loading && colTasks.length === 0 && (
                          <div className="space-y-2.5 pt-1">
                            {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}
                          </div>
                        )}

                        {/* Empty */}
                        {!loading && colTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center"
                              style={{ background: `${col.accent}12` }}
                            >
                              <Icon size={18} style={{ color: `${col.accent}55` }} />
                            </div>
                            <p className="text-[11px] text-muted-foreground/40 text-center">No tasks here</p>
                            <button
                              onClick={() => openAdd(col.id)}
                              className="text-[11px] font-medium px-3 py-1 rounded-full border border-dashed transition-all hover:opacity-80"
                              style={{ color: `${col.accent}70`, borderColor: `${col.accent}30` }}
                            >
                              + Add task
                            </button>
                          </div>
                        )}

                        {colTasks.map((task, idx) => (
                          <KanbanCard
                            key={task.uuid}
                            task={task}
                            index={idx}
                            isDone={col.id === "DONE"}
                            isAdmin={isAdmin}
                            canDelete={canDelete}
                            onOpen={() => setDetailUuid(task.uuid)}
                            onRefresh={fetchTasks}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ══════════════ LIST VIEW ══════════════ */}
      {view === "list" && (
        <div className="animate-fade-in flex-1 rounded-2xl border border-border overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60" style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Task", "Status", "Priority", "Client", "Assigned To", "Due", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex items-center justify-center gap-3 text-muted-foreground">
                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm">Loading tasks…</span>
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                          <Search size={20} className="opacity-30" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">No tasks found</p>
                          <p className="text-xs mt-0.5 opacity-60">Try adjusting filters or create a new task</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  [...tasks]
                    .sort((a, b) => {
                      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      if (a.dueDate) return -1;
                      if (b.dueDate) return 1;
                      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
                    })
                    .map((task, i) => {
                      const col      = COLUMNS.find(c => c.id === task.status);
                      const isDone   = task.status === "DONE";
                      const pri      = PRI_CFG[task.priority] ?? PRI_CFG["MEDIUM"];
                      const members  = task.members?.length ? task.members : task.assignedTo ? [task.assignedTo] : [];
                      const dm       = task.dueDate ? dueMeta(task.dueDate, isDone) : null;

                      return (
                        <tr
                          key={task.uuid}
                          onClick={() => setDetailUuid(task.uuid)}
                          className={`border-b border-border/30 last:border-0 cursor-pointer transition-colors group
                            ${isDone ? "opacity-60" : ""}`}
                          style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.04)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                        >
                          {/* Title */}
                          <td className="px-5 py-3.5 max-w-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: pri.accent }} />
                              <div className="min-w-0">
                                <p className={`font-semibold text-sm truncate ${isDone ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                                  {task.title}
                                </p>
                                {(task._count?.comments ?? 0) > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-0.5">
                                    <MessageCircle size={9} /> {task._count!.comments}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
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

                          {/* Priority */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          {/* Client */}
                          <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {task.client
                              ? <span className="font-medium" style={{ color: "#6366f1" }}>{task.client.companyName}</span>
                              : "—"}
                          </td>

                          {/* Assignees */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {members.length === 0
                              ? <span className="text-muted-foreground text-xs">—</span>
                              : (
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1.5">
                                    {members.slice(0, 3).map(m => <UserAvatar key={m.id} name={m.name} url={m.avatarUrl} size="sm" />)}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {members[0].name.split(" ")[0]}{members.length > 1 ? ` +${members.length - 1}` : ""}
                                  </span>
                                </div>
                              )
                            }
                          </td>

                          {/* Due */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {dm
                              ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  style={{ background: dm.bg, color: dm.color }}>
                                  {dm.icon === "alarm" ? <AlarmClock size={9} /> : <Clock size={9} />}
                                  {dm.label}
                                </span>
                              : <span className="text-muted-foreground/40 text-xs">—</span>
                            }
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isAdmin && (
                                <button
                                  onClick={async e => {
                                    e.stopPropagation();
                                    try {
                                      await api.post("/tasks", {
                                        title: `Copy of ${task.title}`, description: task.description ?? null,
                                        status: "TODO", priority: task.priority, dueDate: task.dueDate ?? null,
                                        clientId: task.clientId ?? null,
                                        memberIds: task.members?.map(m => m.id) ?? (task.assignedToId ? [task.assignedToId] : []),
                                      });
                                      fetchTasks();
                                    } catch { /* ignore */ }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                  title="Duplicate"
                                >
                                  <Copy size={12} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={async e => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete "${task.title}"?`)) return;
                                    try { await api.delete(`/tasks/${task.uuid}`); fetchTasks(); }
                                    catch { /* ignore */ }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/8 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                              <span className="flex items-center gap-0.5 text-xs text-primary/60 group-hover:text-primary font-medium transition-colors ml-1">
                                Open <ChevronRight size={12} />
                              </span>
                            </div>
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

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchTasks}
        defaultStatus={addDefaultStatus}
      />
      {detailUuid && (
        <TaskDetailPanel
          uuid={detailUuid}
          onClose={() => setDetailUuid(null)}
          onUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
