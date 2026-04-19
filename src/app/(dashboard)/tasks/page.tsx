"use client";

// src/app/(dashboard)/tasks/page.tsx
// Task board: Kanban + List toggle, filters, task detail slide-over.

import { useEffect, useState, useCallback } from "react";
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from "@hello-pangea/dnd";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { AddTaskModal } from "@/components/modules/tasks/AddTaskModal";
import { TaskDetailPanel } from "@/components/modules/tasks/TaskDetailPanel";
import { PriorityBadge } from "@/components/modules/tasks/PriorityBadge";
import { TaskStatusBadge } from "@/components/modules/tasks/TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Task, User, Client, ApiResponse } from "@/types";

const COLUMNS = [
  { id: "TODO",        label: "To Do",       color: "border-slate-300" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-400"  },
  { id: "IN_REVIEW",   label: "In Review",   color: "border-violet-400"},
  { id: "DONE",        label: "Done",        color: "border-emerald-400"},
] as const;

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function UserAvatar({ name, url }: { name?: string | null; url?: string | null }) {
  if (!name) return null;
  if (url) return <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover" title={name} />;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-semibold" title={name}>
      {initials}
    </div>
  );
}

function DueDateChip({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = new Date(date);
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const cls = diff < 0 ? "text-red-600" : diff <= 2 ? "text-orange-600" : "text-slate-400";
  return <span className={`text-[11px] font-medium ${cls}`}>{label}</span>;
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"kanban" | "list">("kanban");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("ALL");
  const [priorityFilter, setPriority] = useState("ALL");
  const [assigneeFilter, setAssignee] = useState("ALL");
  const [clientFilter, setClient]   = useState("ALL");
  const [addOpen, setAddOpen]       = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState("TODO");
  const [detailUuid, setDetailUuid] = useState<string | null>(null);
  const [users, setUsers]           = useState<User[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD", "HR"].includes(user?.role ?? "");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)                     params["search"]       = search;
      if (statusFilter   !== "ALL")   params["status"]       = statusFilter;
      if (priorityFilter !== "ALL")   params["priority"]     = priorityFilter;
      if (assigneeFilter !== "ALL")   params["assignedToId"] = assigneeFilter;
      if (clientFilter   !== "ALL")   params["clientId"]     = clientFilter;
      const res = await api.get<ApiResponse<Task[]>>("/tasks", { params });
      setTasks(res.data.data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, assigneeFilter, clientFilter]);

  useEffect(() => {
    const t = setTimeout(fetchTasks, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchTasks, search]);

  useEffect(() => {
    if (isAdmin) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } }).then((r) => setUsers(r.data.data)).catch(() => {});
      api.get<ApiResponse<Client[]>>("/clients").then((r) => setClients(r.data.data)).catch(() => {});
    }
  }, [isAdmin]);

  // ── Kanban drag and drop ────────────────────────────────────────────────
  async function onDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const task = tasks.find((t) => t.uuid === draggableId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.uuid === draggableId ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/tasks/${draggableId}/status`, { status: newStatus });
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => t.uuid === draggableId ? { ...t, status: task.status } : t));
    }
  }

  function openAdd(status = "TODO") {
    setAddDefaultStatus(status);
    setAddOpen(true);
  }

  const tasksByStatus = (status: string) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const totalByStatus = (s: string) => tasks.filter((t) => t.status === s).length;

  // ── Kanban card ─────────────────────────────────────────────────────────
  function KanbanCard({ task, index }: { task: Task; index: number }) {
    return (
      <Draggable draggableId={task.uuid} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setDetailUuid(task.uuid)}
            className={`bg-white rounded-lg border border-slate-200 p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow space-y-2 ${snapshot.isDragging ? "shadow-lg rotate-1" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-800 leading-snug flex-1 line-clamp-2">{task.title}</p>
              <PriorityBadge priority={task.priority} size="xs" />
            </div>
            {task.client && (
              <p className="text-[11px] text-indigo-600 font-medium">{task.client.companyName}</p>
            )}
            <div className="flex items-center justify-between">
              <DueDateChip date={task.dueDate} />
              <div className="flex items-center gap-1">
                {(task._count?.comments ?? 0) > 0 && (
                  <span className="text-[11px] text-slate-400">💬 {task._count!.comments}</span>
                )}
                <UserAvatar name={task.assignedTo?.name} url={task.assignedTo?.avatarUrl} />
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-[#0F172A] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-[#0F172A] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              List
            </button>
          </div>
          <Button onClick={() => openAdd()} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
            + Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-xs text-xs"
        />
        {view === "list" && (
          <Select value={statusFilter} onValueChange={(v) => setStatus(v ?? "ALL")}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              {["TODO","IN_PROGRESS","IN_REVIEW","DONE","CANCELLED"].map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s.replace("_"," ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={priorityFilter} onValueChange={(v) => setPriority(v ?? "ALL")}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Priorities</SelectItem>
            {["LOW","MEDIUM","HIGH","URGENT"].map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && users.length > 0 && (
          <Select value={assigneeFilter} onValueChange={(v) => setAssignee(v ?? "ALL")}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Assignees</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isAdmin && clients.length > 0 && (
          <Select value={clientFilter} onValueChange={(v) => setClient(v ?? "ALL")}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.companyName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || assigneeFilter !== "ALL" || clientFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatus("ALL"); setPriority("ALL"); setAssignee("ALL"); setClient("ALL"); }} className="h-8 text-xs text-slate-500">
            Clear
          </Button>
        )}
      </div>

      {/* ── KANBAN VIEW ─────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.id);
              return (
                <div key={col.id} className="flex flex-col w-72 shrink-0">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 ${col.color} bg-white border-x border-slate-200`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold w-5 h-5">
                        {totalByStatus(col.id)}
                      </span>
                    </div>
                    <button
                      onClick={() => openAdd(col.id)}
                      className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                      title={`Add task to ${col.label}`}
                    >
                      +
                    </button>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-24 overflow-y-auto p-2 space-y-2 rounded-b-lg border border-t-0 border-slate-200 transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/60" : "bg-slate-50"}`}
                      >
                        {loading ? (
                          <p className="text-xs text-slate-400 text-center pt-4">Loading…</p>
                        ) : colTasks.length === 0 ? (
                          <p className="text-xs text-slate-300 text-center pt-4">No tasks</p>
                        ) : (
                          colTasks.map((task, idx) => (
                            <KanbanCard key={task.uuid} task={task} index={idx} />
                          ))
                        )}
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

      {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No tasks found.</td></tr>
                ) : (
                  [...tasks]
                    .sort((a, b) => {
                      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      if (a.dueDate) return -1;
                      if (b.dueDate) return 1;
                      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
                    })
                    .map((task) => {
                      const dueMs  = task.dueDate ? new Date(task.dueDate).getTime() : null;
                      const overdue = dueMs != null && dueMs < Date.now() && task.status !== "DONE";
                      return (
                        <tr
                          key={task.uuid}
                          className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${overdue ? "bg-red-50/30" : ""}`}
                          onClick={() => setDetailUuid(task.uuid)}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-xs">
                            <p className="truncate">{task.title}</p>
                            {task._count?.comments ? (
                              <span className="text-xs text-slate-400">💬 {task._count.comments}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3"><TaskStatusBadge status={task.status} /></td>
                          <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{task.client?.companyName ?? "—"}</td>
                          <td className="px-4 py-3">
                            {task.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <UserAvatar name={task.assignedTo.name} url={task.assignedTo.avatarUrl} />
                                <span className="text-xs text-slate-600">{task.assignedTo.name}</span>
                              </div>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <DueDateChip date={task.dueDate} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-indigo-600 font-medium">Open →</span>
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

      {/* Modals & panels */}
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
