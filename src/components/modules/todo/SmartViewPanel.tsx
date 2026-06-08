"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Star, CalendarDays, UserCheck, AlertCircle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSmartView } from "@/hooks/useTodo";
import { TaskCard } from "./TaskCard";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import type { SmartViewType, TodoTask, TodoList, ApiResponse } from "@/types";

// ── View metadata (Lucide icons, matching sidebar style) ──────────────────────

const VIEW_META: Record<SmartViewType, {
  label:       string;
  icon:        React.ElementType;
  iconColor:   string;
  iconBg:      string;
  description: string;
}> = {
  "today":          { label: "Today",          icon: CalendarDays, iconColor: "#00C4A7", iconBg: "rgba(0,196,167,0.12)",  description: "Tasks due today"                },
  "important":      { label: "Important",      icon: Star,         iconColor: "#F59E0B", iconBg: "rgba(245,158,11,0.12)", description: "Starred lists and tasks"         },
  "assigned-to-me": { label: "Assigned to Me", icon: UserCheck,    iconColor: "#818CF8", iconBg: "rgba(99,102,241,0.12)", description: "Tasks others assigned to you"    },
  "overdue":        { label: "Overdue",        icon: AlertCircle,  iconColor: "#EF4444", iconBg: "rgba(239,68,68,0.12)",  description: "Past due — needs attention"      },
  "completed":      { label: "Completed",      icon: CheckCircle2, iconColor: "#22C55E", iconBg: "rgba(34,197,94,0.12)",  description: "Finished in the last 7 days"     },
};

// ── Filter chip (compact select) ──────────────────────────────────────────────

function FilterChip({
  label, value, options, onChange,
}: {
  label:   string;
  value:   string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const selected = options.find(o => o.value === value);
  const isActive = value !== "all" && value !== options[0]?.value;
  return (
    <Select value={value} onValueChange={v => onChange(v ?? options[0]?.value ?? "all")}>
      <SelectTrigger
        className="h-7 text-xs border gap-1 px-2.5 min-w-0"
        style={{
          borderColor: isActive ? "var(--primary)" : undefined,
          color:       isActive ? "var(--primary)" : undefined,
          background:  isActive ? "rgba(var(--primary-rgb),0.06)" : undefined,
        }}
      >
        <span className="text-muted-foreground shrink-0">{label}:</span>
        <span className="font-medium truncate">{selected?.label ?? "All"}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Panel layouts ─────────────────────────────────────────────────────────────

function TodayPanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  const groups = tasks.reduce<Record<string, TodoTask[]>>((acc, t) => {
    const key = t.listName ?? "No List";
    (acc[key] ??= []).push(t);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([listName, listTasks]) => (
        <div key={listName}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">{listName}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listTasks.map(t => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName={false} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignedPanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  const pending   = tasks.filter(t => t.status !== "completed");
  const completed = tasks.filter(t => t.status === "completed");

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pending.map(t => (
            <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
          ))}
        </div>
      )}

      {/* Completed — shown for 7 days, visually muted */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed ({completed.length})
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-55">
            {completed.map(t => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
      )}
    </div>
  );
}

function OverduePanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  const sorted = [...tasks].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map(t => <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />)}
    </div>
  );
}

function CompletedPanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  function dayLabel(iso: string | null | undefined): string {
    if (!iso) return "Earlier";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return "Earlier";
  }
  const groups = tasks.reduce<Record<string, TodoTask[]>>((acc, t) => {
    const key = dayLabel(t.completedAt);
    (acc[key] ??= []).push(t);
    return acc;
  }, {});
  const order = ["Today", "Yesterday", "Earlier"];
  return (
    <div className="space-y-4">
      {order.filter(k => groups[k]).map(label => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">{label}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups[label].map(t => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Important panel (custom fetch + type filter) ──────────────────────────────

function ImportantPanel({
  typeFilter, onUpdate, onOpen,
}: {
  typeFilter: "all" | "lists" | "tasks";
  onUpdate:  () => void;
  onOpen:    (uuid: string) => void;
}) {
  const [data, setData]       = useState<{ favoriteLists: TodoList[]; favoriteTasks: TodoTask[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<{ favoriteLists: TodoList[]; favoriteTasks: TodoTask[] }>>("/todo/smart/important")
      .then(r => setData(r.data.data))
      .catch(() => toast.error("Failed to load important view"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleList(uuid: string) {
    try {
      await api.patch(`/todo/lists/${uuid}/favorite`);
      setData(null);
      setLoading(true);
      window.dispatchEvent(new CustomEvent("todo-task-mutated"));
    }
    catch { toast.error("Failed to update favourite"); }
  }

  if (loading) return <p className="text-sm text-muted-foreground text-center pt-8">Loading…</p>;
  if (!data) return null;

  const { favoriteLists, favoriteTasks } = data;
  const showLists = typeFilter !== "tasks";
  const showTasks = typeFilter !== "lists";

  if (favoriteLists.length === 0 && favoriteTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-16 gap-2">
        <Star size={40} className="opacity-20 text-amber-400" />
        <p className="text-sm text-muted-foreground">Star lists or tasks to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showLists && favoriteLists.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favourite Lists</p>
          </div>
          <div className="space-y-1.5">
            {favoriteLists.map((list: TodoList & { pendingCount?: number }) => (
              <div
                key={list.uuid}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => window.location.href = `/todo?listUuid=${list.uuid}`}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: list.color ?? "#6366F1" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{list.name}</p>
                  {list.groupName && <p className="text-[11px] text-muted-foreground">{list.groupName}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(list as TodoList & { pendingCount?: number }).pendingCount ?? list.taskCount ?? 0} pending
                </span>
                <button onClick={e => { e.stopPropagation(); void toggleList(list.uuid); }} className="shrink-0">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTasks && favoriteTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favourite Tasks</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {favoriteTasks.map((t: TodoTask) => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / 86_400_000);
}

// ── SmartViewPanel ────────────────────────────────────────────────────────────

interface Props { view: SmartViewType; }

export function SmartViewPanel({ view }: Props) {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [priorityFilter,      setPriority]   = useState("all");
  const [statusFilter,        setStatus]     = useState("all");
  const [assignedByFilter,    setAssignedBy] = useState("all");
  const [overdueFilter,       setOverdue]    = useState("all");
  const [completedDays,       setCompDays]   = useState(7);
  const [completedListFilter, setCompList]   = useState("all");
  const [importantTypeFilter, setImpType]    = useState<"all" | "lists" | "tasks">("all");

  // Reset all filters when view changes
  useEffect(() => {
    setPriority("all"); setStatus("all"); setAssignedBy("all");
    setOverdue("all"); setCompDays(7); setCompList("all"); setImpType("all");
  }, [view]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const hookParams = view === "completed" ? { days: completedDays } : undefined;
  const { tasks, loading, refetch } = useSmartView(
    view === "important" ? null : view,
    hookParams
  );

  const [openTaskUuid, setOpenTaskUuid] = useState<string | null>(null);
  const meta = VIEW_META[view] ?? VIEW_META["today"];
  const ViewIcon = meta.icon;

  // ── Derived filter options ──────────────────────────────────────────────────
  const assigners = useMemo(() => {
    if (view !== "assigned-to-me") return [];
    const seen = new Set<string>();
    const result: string[] = [];
    tasks.forEach(t => {
      if (t.assignedByName && !seen.has(t.assignedByName)) {
        seen.add(t.assignedByName); result.push(t.assignedByName);
      }
    });
    return result;
  }, [tasks, view]);

  const completedLists = useMemo(() => {
    if (view !== "completed") return [];
    const seen = new Set<string>();
    const result: string[] = [];
    tasks.forEach(t => {
      if (t.listName && !seen.has(t.listName)) {
        seen.add(t.listName); result.push(t.listName);
      }
    });
    return result;
  }, [tasks, view]);

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (priorityFilter !== "all") {
      result = result.filter(t => t.priority === priorityFilter);
    }
    if (view === "today" && statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }
    if (view === "assigned-to-me" && assignedByFilter !== "all") {
      result = result.filter(t => t.assignedByName === assignedByFilter);
    }
    if (view === "overdue" && overdueFilter !== "all") {
      const minDays = parseInt(overdueFilter);
      result = result.filter(t => t.dueDate && daysOverdue(t.dueDate) >= minDays);
    }
    if (view === "completed" && completedListFilter !== "all") {
      result = result.filter(t => t.listName === completedListFilter);
    }

    return result;
  }, [tasks, view, priorityFilter, statusFilter, assignedByFilter, overdueFilter, completedListFilter]);

  const isFiltered  = filteredTasks.length !== tasks.length;
  const displayCount = filteredTasks.length;
  const totalCount   = tasks.length;

  // ── Filter bar per view ────────────────────────────────────────────────────
  const PRIORITY_OPTS = [
    { value: "all",    label: "All"    },
    { value: "high",   label: "High"   },
    { value: "medium", label: "Medium" },
    { value: "low",    label: "Low"    },
    { value: "none",   label: "None"   },
  ];

  function renderFilterBar() {
    if (view === "today") return (
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="Priority" value={priorityFilter}
          options={PRIORITY_OPTS}
          onChange={setPriority}
        />
        <FilterChip
          label="Show" value={statusFilter}
          options={[
            { value: "all",       label: "All"            },
            { value: "pending",   label: "Pending only"   },
            { value: "completed", label: "Completed today" },
          ]}
          onChange={setStatus}
        />
      </div>
    );

    if (view === "assigned-to-me") return (
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="Priority" value={priorityFilter}
          options={PRIORITY_OPTS.filter(o => o.value !== "none")}
          onChange={setPriority}
        />
        {assigners.length > 1 && (
          <FilterChip
            label="From" value={assignedByFilter}
            options={[
              { value: "all", label: "All" },
              ...assigners.map(a => ({ value: a, label: a })),
            ]}
            onChange={setAssignedBy}
          />
        )}
      </div>
    );

    if (view === "overdue") return (
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="Priority" value={priorityFilter}
          options={PRIORITY_OPTS.filter(o => o.value !== "none")}
          onChange={setPriority}
        />
        <FilterChip
          label="Overdue" value={overdueFilter}
          options={[
            { value: "all", label: "All"       },
            { value: "3",   label: "> 3 days"  },
            { value: "7",   label: "> 7 days"  },
            { value: "14",  label: "> 14 days" },
          ]}
          onChange={setOverdue}
        />
      </div>
    );

    if (view === "completed") return (
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label="Last" value={String(completedDays)}
          options={[
            { value: "7",  label: "7 days"  },
            { value: "14", label: "14 days" },
            { value: "30", label: "30 days" },
          ]}
          onChange={v => setCompDays(Number(v))}
        />
        {completedLists.length > 1 && (
          <FilterChip
            label="List" value={completedListFilter}
            options={[
              { value: "all", label: "All" },
              ...completedLists.map(l => ({ value: l, label: l })),
            ]}
            onChange={setCompList}
          />
        )}
      </div>
    );

    if (view === "important") return (
      <div className="flex items-center gap-2">
        <FilterChip
          label="Show" value={importantTypeFilter}
          options={[
            { value: "all",   label: "All"        },
            { value: "lists", label: "Lists only"  },
            { value: "tasks", label: "Tasks only"  },
          ]}
          onChange={v => setImpType(v as "all" | "lists" | "tasks")}
        />
      </div>
    );

    return null;
  }

  // ── Content ─────────────────────────────────────────────────────────────────
  function renderContent() {
    if (view === "important") {
      return <ImportantPanel typeFilter={importantTypeFilter} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    }

    if (loading) return <p className="text-sm text-muted-foreground pt-8 text-center">Loading…</p>;

    if (filteredTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center pt-20 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center opacity-20"
            style={{ background: "var(--muted)" }}
          >
            <ViewIcon size={32} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isFiltered ? "No tasks match this filter" : "No tasks here"}
          </p>
        </div>
      );
    }

    if (view === "today")     return <TodayPanel    tasks={filteredTasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    if (view === "overdue")   return <OverduePanel  tasks={filteredTasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    if (view === "completed") return <CompletedPanel tasks={filteredTasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    return <AssignedPanel tasks={filteredTasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0 pb-4 border-b border-border">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: meta.iconBg, border: `1px solid ${meta.iconColor}30` }}
        >
          <ViewIcon size={20} style={{ color: meta.iconColor }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{meta.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        </div>
        {!loading && view !== "important" && totalCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold px-2">
            {isFiltered ? `${displayCount} of ${totalCount}` : totalCount}
          </span>
        )}
      </div>

      {/* Filter bar */}
      {renderFilterBar() && (
        <div className="shrink-0 mb-4">
          {renderFilterBar()}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      <TaskDetailDrawer
        taskUuid={openTaskUuid}
        onClose={() => setOpenTaskUuid(null)}
        onUpdate={refetch}
      />
    </div>
  );
}
