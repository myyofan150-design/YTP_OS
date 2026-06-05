"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd";
import {
  MoreHorizontal, Pencil, Trash2, Plus, Check,
  Search, X, LayoutGrid, List, UserPlus, Users,
  Flame, Zap, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useTodoList } from "@/hooks/useTodo";
import { useAuth } from "@/hooks/useAuth";
import { TaskCard } from "./TaskCard";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import type { ApiResponse, TodoTask } from "@/types";

function FilterSelect({
  label, value, options, placeholder = "All",
  onChange,
}: {
  label:    string;
  value:    string;
  options:  { value: string; label: string }[];
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const selected = options.find(o => o.value === value);
  const isActive = !!value && value !== "";
  return (
    <Select value={value} onValueChange={v => onChange(v ?? "")}>
      <SelectTrigger
        className="h-9 text-sm w-36"
        style={{
          borderColor: isActive ? "var(--primary)" : undefined,
          color:       isActive ? "var(--primary)" : undefined,
          background:  isActive ? "rgba(var(--primary-rgb),0.06)" : undefined,
        }}
      >
        <span className="flex items-center gap-1 truncate min-w-0">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface EmpOption { id: number; name: string; email: string }

// ── Column config ──────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    id:       "todo"       as const,
    label:    "Urgent",
    icon:     Flame,
    accent:   "#ef4444",
    glow:     "rgba(239,68,68,0.12)",
    headerBg: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)",
    zoneBg:   "rgba(239,68,68,0.025)",
    overBg:   "rgba(239,68,68,0.06)",
    pillCls:  "bg-red-500/12 text-red-400 border-red-500/25",
    emptyMsg: "No urgent tasks",
  },
  {
    id:       "inprogress" as const,
    label:    "In Progress",
    icon:     Zap,
    accent:   "#6366f1",
    glow:     "rgba(99,102,241,0.12)",
    headerBg: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
    zoneBg:   "rgba(99,102,241,0.025)",
    overBg:   "rgba(99,102,241,0.06)",
    pillCls:  "bg-indigo-500/12 text-indigo-400 border-indigo-500/25",
    emptyMsg: "No active tasks",
  },
  {
    id:       "completed"  as const,
    label:    "Completed",
    icon:     Trophy,
    accent:   "#22c55e",
    glow:     "rgba(34,197,94,0.12)",
    headerBg: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)",
    zoneBg:   "rgba(34,197,94,0.025)",
    overBg:   "rgba(34,197,94,0.06)",
    pillCls:  "bg-green-500/12 text-green-400 border-green-500/25",
    emptyMsg: "Finished tasks appear here",
  },
] as const;

type ColId = typeof COLUMNS[number]["id"];

function colTasks(tasks: TodoTask[], col: ColId): TodoTask[] {
  if (col === "completed")  return tasks.filter(t => t.status === "completed");
  if (col === "todo")       return tasks.filter(t => t.status === "pending" && t.stage === "todo");
  return tasks.filter(t => t.status === "pending" && t.stage !== "todo");
}

const PRIORITY_OPTS = [
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
  { value: "none",   label: "None"   },
];

const STATUS_OPTS = [
  { value: "urgent",      label: "Urgent"      },
  { value: "inprogress",  label: "In Progress" },
  { value: "completed",   label: "Completed"   },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface Props { listUuid: string; }

export function ListDetailPanel({ listUuid }: Props) {
  const { list, loading, refetch, createTask } = useTodoList(listUuid);
  const { user: currentUser } = useAuth();

  const [editingName,  setEditingName]  = useState(false);
  const [nameValue,    setNameValue]    = useState("");
  const [view,         setView]         = useState<"board" | "list">("board");
  const [search,       setSearch]       = useState("");
  const [priFilter,    setPriFilter]    = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addingTo,     setAddingTo]     = useState<ColId | null>(null);
  const [addTitle,     setAddTitle]     = useState("");
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [openTaskUuid, setOpenTaskUuid] = useState<string | null>(null);

  // member management
  const [membersOpen,  setMembersOpen]  = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [employees,    setEmployees]    = useState<EmpOption[]>([]);
  const memberPanelRef = useRef<HTMLDivElement>(null);
  const addInputRef    = useRef<HTMLInputElement>(null);

  const isOwner = !!currentUser && !!list && list.createdBy === currentUser.id;
  const members = (list as (typeof list & { members?: Array<{ id: number; name: string; avatarUrl?: string | null }> }) | null)?.members ?? [];

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (memberPanelRef.current && !memberPanelRef.current.contains(e.target as Node)) {
        setMembersOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function loadEmployees() {
    if (employees.length > 0) return;
    try {
      const r = await api.get<ApiResponse<EmpOption[]>>("/employees/directory");
      setEmployees(r.data.data ?? []);
    } catch { /* non-fatal */ }
  }

  async function addMember(userId: number) {
    if (!list) return;
    try { await api.post(`/todo/lists/${list.uuid}/members`, { userIds: [userId] }); await refetch(); }
    catch { toast.error("Failed to add member"); }
  }

  async function removeMember(userId: number) {
    if (!list) return;
    try { await api.delete(`/todo/lists/${list.uuid}/members/${userId}`); await refetch(); }
    catch { toast.error("Failed to remove member"); }
  }

  const allTasks     = list?.tasks ?? [];
  const totalCount   = allTasks.length;
  const doneCount    = allTasks.filter(t => t.status === "completed").length;
  const pendingCount = totalCount - doneCount;
  const donePercent  = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const hasFilters = !!(search || priFilter || statusFilter);

  function clearFilters() {
    setSearch(""); setPriFilter(""); setStatusFilter("");
  }

  const filteredTasks = allTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priFilter && t.priority !== priFilter) return false;
    if (statusFilter === "urgent")     return t.status === "pending" && t.priority === "high";
    if (statusFilter === "inprogress") return t.status === "pending" && t.priority === "medium";
    if (statusFilter === "completed")  return t.status === "completed";
    return true;
  });

  async function saveName() {
    const n = nameValue.trim();
    if (!n || !list || n === list.name) { setEditingName(false); return; }
    try { await api.patch(`/todo/lists/${list.uuid}`, { name: n }); await refetch(); }
    catch { toast.error("Failed to rename list"); }
    finally { setEditingName(false); }
  }

  async function deleteList() {
    if (!list) return;
    setListMenuOpen(false);
    if (!confirm(`Delete list "${list.name}" and all its tasks?`)) return;
    try { await api.delete(`/todo/lists/${list.uuid}`); toast.success("List deleted"); window.history.back(); }
    catch { toast.error("Failed to delete list"); }
  }

  function openAddIn(col: ColId) {
    setAddingTo(col);
    setAddTitle("");
    setTimeout(() => addInputRef.current?.focus(), 60);
  }

  async function submitAdd() {
    const title = addTitle.trim();
    if (!title || !addingTo) return;
    const stage = addingTo === "completed" ? "inprogress" : addingTo;
    const ok = await createTask({ title, stage });
    if (ok) { setAddTitle(""); setAddingTo(null); }
  }

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    const srcCol = source.droppableId as ColId;
    const dstCol = destination.droppableId as ColId;
    if (srcCol === dstCol) return;
    const task = allTasks.find(t => t.uuid === draggableId);
    if (!task) return;
    try {
      if (dstCol === "completed") {
        if (task.status !== "completed") await api.patch(`/todo/tasks/${draggableId}/status`);
      } else {
        await api.patch(`/todo/tasks/${draggableId}`, { stage: dstCol });
        if (task.status === "completed") await api.patch(`/todo/tasks/${draggableId}/status`);
      }
      await refetch();
    } catch { toast.error("Failed to move task"); refetch(); }
  }, [allTasks, refetch]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading && !list) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Loading list…</span>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Search size={20} className="opacity-40" />
        </div>
        <p className="text-sm">List not found.</p>
      </div>
    );
  }

  const listColor = list.color ?? "#6366F1";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* ══════════════ PAGE HEADER ══════════════ */}
      <div className="shrink-0 mb-6">

        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">

            {/* Color orb */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${listColor}30, ${listColor}10)`,
                border:     `1px solid ${listColor}40`,
                boxShadow:  `0 4px 12px ${listColor}25`,
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{
                  background: listColor,
                  boxShadow:  `0 0 10px ${listColor}90`,
                }}
              />
            </div>

            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => {
                  if (e.key === "Enter")  saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="text-2xl font-bold bg-transparent border-b-2 text-foreground outline-none flex-1 min-w-0 tracking-tight"
                style={{ borderColor: listColor }}
              />
            ) : (
              <h1
                onClick={() => { setNameValue(list.name); setEditingName(true); }}
                title="Click to rename"
                className="text-2xl font-bold text-foreground cursor-text hover:opacity-75 transition-opacity truncate tracking-tight"
              >
                {list.name}
              </h1>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-muted/40 rounded-xl p-1 border border-border/40 gap-0.5">
              {([
                { v: "board" as const, icon: LayoutGrid, label: "Board" },
                { v: "list"  as const, icon: List,        label: "List"  },
              ] as const).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                    ${view === v
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setListMenuOpen(v => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-transparent hover:border-border/50"
              >
                <MoreHorizontal size={16} />
              </button>
              {listMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setListMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 min-w-[170px] bg-card rounded-2xl border border-border shadow-2xl shadow-black/20 py-2">
                    <button
                      onClick={() => { setListMenuOpen(false); setNameValue(list.name); setEditingName(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-muted/50 text-left text-foreground transition-colors"
                    >
                      <Pencil size={12} /> Rename List
                    </button>
                    <div className="my-1.5 mx-3 border-t border-border/60" />
                    <button
                      onClick={deleteList}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-red-500/8 text-left text-red-400 transition-colors"
                    >
                      <Trash2 size={12} /> Delete List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats + progress */}
        {totalCount > 0 && (
          <div className="flex items-center gap-5 mt-4 pl-14">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-muted-foreground">{pendingCount} pending</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: listColor }} />
                <span className="text-muted-foreground">{doneCount} done</span>
              </span>
              <span className="font-bold text-sm tabular-nums" style={{ color: listColor }}>
                {donePercent}%
              </span>
            </div>
            <div className="flex-1 max-w-[200px] h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width:      `${donePercent}%`,
                  background: `linear-gradient(90deg, ${listColor}cc, ${listColor})`,
                  boxShadow:  `0 0 8px ${listColor}60`,
                }}
              />
            </div>
          </div>
        )}

        {/* Members bar */}
        <div className="flex items-center gap-2.5 mt-3.5 pl-14">
          {members.length > 0 && (
            <div className="flex items-center -space-x-2">
              {members.slice(0, 6).map((m: { id: number; name: string; avatarUrl?: string | null }) => (
                <div
                  key={m.id}
                  title={m.name}
                  className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${listColor}cc, ${listColor}80)` }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 6 && (
                <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                  +{members.length - 6}
                </div>
              )}
            </div>
          )}

          {members.length > 0 && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <Users size={11} />
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          )}

          {isOwner && (
            <div className="relative" ref={memberPanelRef}>
              <button
                onClick={() => { setMembersOpen(v => !v); loadEmployees(); }}
                title="Manage shared members"
                className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium border border-dashed transition-all
                  text-muted-foreground border-border/60 hover:text-foreground hover:border-primary/50 hover:bg-primary/5"
              >
                <UserPlus size={11} />
                {members.length === 0 ? "Share list" : "Manage"}
              </button>

              {membersOpen && (
                <div className="absolute left-0 top-9 z-50 w-72 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-border/60">
                    <p className="text-sm font-semibold text-foreground mb-0.5">Shared members</p>
                    <p className="text-xs text-muted-foreground mb-2.5">
                      {members.length === 0 ? "No one yet — add employees below" : `${members.length} ${members.length === 1 ? "person has" : "people have"} access`}
                    </p>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                      <input
                        autoFocus
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Search employees…"
                        className="w-full pl-8 pr-3 h-8 rounded-xl border border-border bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto">
                    {members
                      .filter((m: { id: number; name: string }) =>
                        !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((m: { id: number; name: string }) => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: listColor }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground">Has access</p>
                          </div>
                          <button
                            onClick={() => removeMember(m.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove access"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}

                    {employees.filter(e => !members.some((m: { id: number }) => m.id === e.id) &&
                      (!memberSearch ||
                        (e.name ?? "").toLowerCase().includes(memberSearch.toLowerCase()) ||
                        (e.email ?? "").toLowerCase().includes(memberSearch.toLowerCase())))
                      .map(e => (
                        <button
                          key={e.id}
                          onClick={() => addMember(e.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full border border-dashed border-border bg-muted/40 flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                            {(e.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{e.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{e.email}</p>
                          </div>
                          <div className="w-6 h-6 flex items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/50 hover:border-primary/50 hover:text-primary transition-colors">
                            <Plus size={10} />
                          </div>
                        </button>
                      ))}

                    {employees.length === 0 && members.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Loading employees…</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ TOOLBAR ══════════════ */}
      <div className="flex items-center gap-2.5 mb-5 shrink-0 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9 pr-7 h-9 w-48 rounded-xl border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card focus:w-60 transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <FilterSelect
          label="Priority"
          value={priFilter}
          options={PRIORITY_OPTS}
          onChange={setPriFilter}
        />

        <FilterSelect
          label="Status"
          value={statusFilter}
          options={STATUS_OPTS}
          onChange={setStatusFilter}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity"
          >
            <X size={13} /> Clear
          </button>
        )}

        <button
          onClick={() => openAddIn("inprogress")}
          className="ml-auto flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-semibold text-primary-foreground transition-all shadow-md hover:shadow-lg hover:opacity-90 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${listColor}, ${listColor}cc)`, boxShadow: `0 4px 12px ${listColor}40` }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* ══════════════ BOARD VIEW ══════════════ */}
      {view === "board" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-0">
            {COLUMNS.map(col => {
              const tasks    = colTasks(filteredTasks, col.id);
              const isAdding = addingTo === col.id;
              const Icon     = col.icon;

              return (
                <div key={col.id} className="flex flex-col w-[290px] shrink-0 min-h-0">

                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-t-2xl mb-0"
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
                      {tasks.length > 0 && (
                        <span
                          className="text-[11px] font-bold w-5 h-5 rounded-full inline-flex items-center justify-center tabular-nums"
                          style={{ background: `${col.accent}20`, color: col.accent }}
                        >
                          {tasks.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openAddIn(col.id)}
                      title={`Add task`}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ color: `${col.accent}cc` }}
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
                        {/* Skeleton while loading */}
                        {loading && tasks.length === 0 && !isAdding && (
                          <div className="space-y-2.5 pt-1">
                            {[1, 2].map(i => (
                              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
                            ))}
                          </div>
                        )}

                        {/* Empty state */}
                        {!loading && tasks.length === 0 && !isAdding && (
                          <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center"
                              style={{ background: `${col.accent}12` }}
                            >
                              <Icon size={18} style={{ color: `${col.accent}60` }} />
                            </div>
                            <p className="text-[11px] text-center text-muted-foreground/50 leading-relaxed max-w-[140px]">
                              {col.emptyMsg}
                            </p>
                            <button
                              onClick={() => openAddIn(col.id)}
                              className="text-[11px] font-medium transition-colors px-3 py-1 rounded-full border border-dashed"
                              style={{
                                color:        `${col.accent}80`,
                                borderColor:  `${col.accent}30`,
                              }}
                            >
                              + Add task
                            </button>
                          </div>
                        )}

                        {/* Task cards */}
                        {tasks.map((task, idx) => (
                          <Draggable key={task.uuid} draggableId={task.uuid} index={idx}>
                            {(drag, dragSnap) => (
                              <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
                                <TaskCard
                                  task={task}
                                  onUpdate={refetch}
                                  onOpen={() => setOpenTaskUuid(task.uuid)}
                                  isDragging={dragSnap.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Inline add form */}
                        {isAdding && (
                          <div
                            className="rounded-2xl p-3.5 shadow-lg"
                            style={{
                              background: "var(--card)",
                              border:     `1.5px solid ${col.accent}40`,
                              boxShadow:  `0 4px 20px ${col.glow}, 0 0 0 3px ${col.accent}08`,
                            }}
                          >
                            <input
                              ref={addInputRef}
                              value={addTitle}
                              onChange={e => setAddTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter")  { e.preventDefault(); submitAdd(); }
                                if (e.key === "Escape") { setAddingTo(null); setAddTitle(""); }
                              }}
                              placeholder="Task name…"
                              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-medium"
                            />
                            <div className="flex items-center gap-1.5 mt-3">
                              <button
                                onClick={submitAdd}
                                disabled={!addTitle.trim()}
                                className="flex items-center gap-1 h-7 px-3 rounded-lg text-[11px] font-bold text-white disabled:opacity-40 transition-all active:scale-95"
                                style={{ background: col.accent, boxShadow: `0 2px 8px ${col.accent}50` }}
                              >
                                <Check size={10} /> Add
                              </button>
                              <button
                                onClick={() => { setAddingTo(null); setAddTitle(""); }}
                                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
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
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-24 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Search size={22} className="text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No tasks found</p>
                <p className="text-xs text-muted-foreground mt-0.5">Try a different search or filter</p>
              </div>
            </div>
          ) : (
            <>
              {(["todo", "inprogress"] as const).map(pri => {
                const col      = COLUMNS.find(c => c.id === pri)!;
                const Icon     = col.icon;
                const priTasks = filteredTasks.filter(t =>
                  t.status === "pending" &&
                  (pri === "todo" ? t.stage === "todo" : t.stage !== "todo")
                );
                if (priTasks.length === 0) return null;
                return (
                  <div key={pri}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${col.accent}15` }}
                      >
                        <Icon size={12} style={{ color: col.accent }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground/80">{col.label}</span>
                      <span
                        className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: `${col.accent}18`, color: col.accent }}
                      >
                        {priTasks.length}
                      </span>
                      <div className="flex-1 h-px" style={{ background: `${col.accent}20` }} />
                    </div>
                    <div className="space-y-2 pl-8">
                      {priTasks.map(task => (
                        <TaskCard
                          key={task.uuid}
                          task={task}
                          onUpdate={refetch}
                          onOpen={() => setOpenTaskUuid(task.uuid)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {(() => {
                const doneTasks = filteredTasks.filter(t => t.status === "completed");
                if (doneTasks.length === 0) return null;
                const col  = COLUMNS.find(c => c.id === "completed")!;
                const Icon = col.icon;
                return (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${col.accent}15` }}
                      >
                        <Icon size={12} style={{ color: col.accent }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground/80">{col.label}</span>
                      <span
                        className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: `${col.accent}18`, color: col.accent }}
                      >
                        {doneTasks.length}
                      </span>
                      <div className="flex-1 h-px" style={{ background: `${col.accent}20` }} />
                    </div>
                    <div className="space-y-2 pl-8">
                      {doneTasks.map(task => (
                        <TaskCard
                          key={task.uuid}
                          task={task}
                          onUpdate={refetch}
                          onOpen={() => setOpenTaskUuid(task.uuid)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      <TaskDetailDrawer
        taskUuid={openTaskUuid}
        onClose={() => setOpenTaskUuid(null)}
        onUpdate={refetch}
      />
    </div>
  );
}
