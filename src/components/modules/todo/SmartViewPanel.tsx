"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSmartView } from "@/hooks/useTodo";
import { TaskCard } from "./TaskCard";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import type { SmartViewType, TodoTask, TodoList, ApiResponse } from "@/types";

const VIEW_META: Record<SmartViewType, { label: string; emoji: string; description: string }> = {
  "today":          { label: "Today",          emoji: "☀️",  description: "Tasks due today" },
  "important":      { label: "Important",      emoji: "⭐",  description: "Starred lists and tasks" },
  "assigned-to-me": { label: "Assigned to Me", emoji: "👤",  description: "Tasks others assigned to you" },
  "overdue":        { label: "Overdue",        emoji: "⏰",  description: "Past due — needs attention" },
  "completed":      { label: "Completed",      emoji: "✅",  description: "Finished in the last 7 days" },
};

interface Props { view: SmartViewType; }

// ── Today: grouped by list ────────────────────────────────────────────────────

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
          <div className="space-y-1">
            {listTasks.map(t => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName={false} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assigned-to-me: show "from {name}" ───────────────────────────────────────

function AssignedPanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  return (
    <div className="space-y-1">
      {tasks.map(t => (
        <div key={t.uuid} className="space-y-0">
          <TaskCard task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
        </div>
      ))}
    </div>
  );
}

// ── Overdue: sorted by most overdue, red chips ────────────────────────────────

function OverduePanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  const sorted = [...tasks].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db; // oldest first
  });
  return (
    <div className="space-y-1">
      {sorted.map(t => <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />)}
    </div>
  );
}

// ── Completed: grouped by date ────────────────────────────────────────────────

function CompletedPanel({ tasks, onUpdate, onOpen }: { tasks: TodoTask[]; onUpdate: () => void; onOpen: (uuid: string) => void }) {
  function dayLabel(iso: string | null | undefined): string {
    if (!iso) return "Earlier";
    const d    = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
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
          <div className="space-y-1">
            {groups[label].map(t => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Important: favourite lists + favourite tasks ──────────────────────────────

function ImportantPanel({ onUpdate, onOpen }: { onUpdate: () => void; onOpen: (uuid: string) => void }) {
  const [data, setData]     = useState<{ favoriteLists: TodoList[]; favoriteTasks: TodoTask[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<{ favoriteLists: TodoList[]; favoriteTasks: TodoTask[] }>>("/todo/smart/important")
      .then(r => setData(r.data.data))
      .catch(() => toast.error("Failed to load important view"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleList(uuid: string) {
    try { await api.patch(`/todo/lists/${uuid}/favorite`); setData(null); setLoading(true); }
    catch { toast.error("Failed to update favourite"); }
  }

  if (loading) return <p className="text-sm text-muted-foreground text-center pt-8">Loading…</p>;
  if (!data) return null;

  const { favoriteLists, favoriteTasks } = data;

  return (
    <div className="space-y-6">
      {favoriteLists.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">⭐ Favourite Lists</p>
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
                <button
                  onClick={e => { e.stopPropagation(); void toggleList(list.uuid); }}
                  className="shrink-0"
                >
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {favoriteTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">⭐ Favourite Tasks</p>
          <div className="space-y-1">
            {favoriteTasks.map((t: TodoTask) => (
              <TaskCard key={t.uuid} task={t} onUpdate={onUpdate} onOpen={() => onOpen(t.uuid)} showListName />
            ))}
          </div>
        </div>
      )}

      {favoriteLists.length === 0 && favoriteTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-16 gap-2">
          <span className="text-4xl opacity-20">⭐</span>
          <p className="text-sm text-muted-foreground">Star lists or tasks to see them here</p>
        </div>
      )}
    </div>
  );
}

// ── SmartViewPanel ────────────────────────────────────────────────────────────

export function SmartViewPanel({ view }: Props) {
  const { tasks, loading, refetch } = useSmartView(view === "important" ? null : view);
  const [openTaskUuid, setOpenTaskUuid] = useState<string | null>(null);
  const meta = VIEW_META[view] ?? VIEW_META["today"];

  function renderContent() {
    if (view === "important") {
      return (
        <ImportantPanel
          onUpdate={refetch}
          onOpen={setOpenTaskUuid}
        />
      );
    }

    if (loading) return <p className="text-sm text-muted-foreground pt-8 text-center">Loading…</p>;

    if (tasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center pt-20 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl opacity-20"
            style={{ background: "var(--muted)" }}>
            {meta.emoji}
          </div>
          <p className="text-sm text-muted-foreground">No tasks here</p>
        </div>
      );
    }

    if (view === "today")    return <TodayPanel    tasks={tasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    if (view === "overdue")  return <OverduePanel  tasks={tasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
    if (view === "completed") return <CompletedPanel tasks={tasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;

    return <AssignedPanel tasks={tasks} onUpdate={refetch} onOpen={setOpenTaskUuid} />;
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 shrink-0 pb-4 border-b border-border">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: "rgba(3,255,148,0.08)", border: "1px solid rgba(3,255,148,0.2)" }}
        >
          {meta.emoji}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{meta.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        </div>
        {!loading && view !== "important" && tasks.length > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold px-2">
            {tasks.length}
          </span>
        )}
      </div>

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
