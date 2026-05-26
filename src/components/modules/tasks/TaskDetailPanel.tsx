"use client";

// src/components/modules/tasks/TaskDetailPanel.tsx
// Slide-over panel for full task detail: info, comments, attachments, sub-tasks.

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { timeAgo, resolveAssetUrl } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TaskDetail, User, Client, ApiResponse } from "@/types";

const STATUSES   = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review",
  DONE: "Done", CANCELLED: "Cancelled",
};

function Avatar({ name, url, size = 7 }: { name: string; url?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolveAssetUrl(url);
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-orange-400", "bg-teal-500", "bg-purple-500", "bg-blue-500", "bg-pink-400", "bg-amber-500"];
  const bg = colors[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  if (src && !imgErr) return (
    <img src={src} alt={name} onError={() => setImgErr(true)}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  );
  return (
    <div className={`w-${size} h-${size} rounded-full ${bg} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

interface Props {
  uuid: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function TaskDetailPanel({ uuid, onClose, onUpdated }: Props) {
  const { user } = useAuthStore();
  const [task, setTask]         = useState<TaskDetail | null>(null);
  const [loading, setLoading]   = useState(false);
  const [users, setUsers]       = useState<User[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [comment, setComment]   = useState("");
  const [commenting, setCommenting] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [memberDropOpen, setMemberDropOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [duplicating, setDuplicating]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const memberDropRef = useRef<HTMLDivElement>(null);

  const isAdmin   = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD"].includes(user?.role ?? "");
  const canDelete = ["SUPER_ADMIN", "ADMIN"].includes(user?.role ?? "");

  const fetchTask = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<TaskDetail>>(`/tasks/${uuid}`);
      setTask(res.data.data);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchTask();
    if (isAdmin) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } }).then((r) => setUsers(r.data.data)).catch(() => {});
      api.get<ApiResponse<Client[]>>("/clients", { params: { status: "ACTIVE" } }).then((r) => setClients(r.data.data)).catch(() => {});
    }
  }, [fetchTask, isAdmin]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (memberDropRef.current && !memberDropRef.current.contains(e.target as Node)) {
        setMemberDropOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.uuid}`);
      onUpdated();
      onClose();
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function handleDuplicate() {
    if (!task) return;
    setDuplicating(true);
    try {
      await api.post("/tasks", {
        title:       `Copy of ${task.title}`,
        description: task.description ?? null,
        status:      "TODO",
        priority:    task.priority,
        dueDate:     task.dueDate ?? null,
        clientId:    task.clientId ?? null,
        memberIds:   task.members?.map((m) => m.id) ?? (task.assignedToId ? [task.assignedToId] : []),
      });
      onUpdated();
      onClose();
    } catch {
      /* silently ignore */
    } finally {
      setDuplicating(false);
    }
  }

  async function patchField(field: string, value: unknown) {
    if (!task) return;
    try {
      await api.patch(`/tasks/${task.uuid}`, { [field]: value });
      fetchTask();
      onUpdated();
    } catch { /* ignore — field snaps back on refresh */ }
  }

  // Resolve current members: prefer task.members (new API), fall back to assignedTo
  function currentMembers() {
    if (!task) return [];
    return task.members?.length
      ? task.members
      : task.assignedTo
      ? [task.assignedTo]
      : [];
  }

  function addMember(userId: number) {
    const newIds = [...currentMembers().map((m) => m.id), userId];
    patchField("memberIds", newIds);
    setMemberDropOpen(false);
  }

  function removeMember(memberId: number) {
    const newIds = currentMembers().filter((m) => m.id !== memberId).map((m) => m.id);
    patchField("memberIds", newIds);
  }

  async function handleComment(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!comment.trim() || !task) return;
    setCommenting(true);
    try {
      await api.post(`/tasks/${task.uuid}/comments`, { body: comment.trim() });
      setComment("");
      fetchTask();
    } finally {
      setCommenting(false);
    }
  }

  async function deleteComment(commentId: number) {
    if (!task) return;
    await api.delete(`/tasks/${task.uuid}/comments/${commentId}`);
    fetchTask();
  }

  async function addSubTask(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!subInput.trim() || !task) return;
    setAddingSub(true);
    try {
      await api.post("/tasks", {
        title:        subInput.trim(),
        status:       "TODO",
        priority:     "MEDIUM",
        assignedById: user!.id,
        clientId:     task.clientId,
        memberIds:    task.members?.map((m) => m.id) ?? (task.assignedToId ? [task.assignedToId] : []),
        parentTaskId: task.id,
      });
      setSubInput("");
      fetchTask();
    } finally {
      setAddingSub(false);
    }
  }

  async function toggleSubTask(subUuid: string, currentStatus: string) {
    const next = currentStatus === "DONE" ? "TODO" : "DONE";
    await api.patch(`/tasks/${subUuid}/status`, { status: next });
    fetchTask();
  }

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/tasks/${task.uuid}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    if (fileRef.current) fileRef.current.value = "";
    fetchTask();
  }

  async function deleteAttachment(attachId: number) {
    if (!task) return;
    await api.delete(`/tasks/${task.uuid}/attachments/${attachId}`);
    fetchTask();
  }

  const apiBase = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

  if (!uuid) return null;

  const members = currentMembers();
  const availableUsers = users.filter((u) => !members.find((m) => m.id === u.id));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0 gap-3">
          <h2 className="text-sm font-semibold text-slate-800 shrink-0">Task Details</h2>

          <div className="flex items-center gap-2 ml-auto">
            {isAdmin && task && (
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {duplicating ? "Duplicating…" : "Duplicate"}
              </button>
            )}

            {canDelete && task && (
              deleteConfirm ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-medium">Sure?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? "…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )
            )}

            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none ml-1">✕</button>
          </div>
        </div>

        {loading && !task && (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading…</div>
        )}

        {task && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Title */}
            {isAdmin ? (
              <input
                defaultValue={task.title}
                onBlur={(e) => { if (e.target.value !== task.title) patchField("title", e.target.value); }}
                className="w-full text-lg font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none pb-1 transition-colors"
              />
            ) : (
              <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
            )}

            {/* Description */}
            {isAdmin ? (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                <textarea
                  defaultValue={task.description ?? ""}
                  onBlur={(e) => { if (e.target.value !== (task.description ?? "")) patchField("description", e.target.value || null); }}
                  rows={3}
                  placeholder="Add a description…"
                  className="w-full text-sm text-slate-700 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
            ) : task.description ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{task.description}</p>
            ) : null}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                <Select
                  value={task.status}
                  onValueChange={(v) => v && patchField("status", v)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Priority</p>
                {isAdmin ? (
                  <Select value={task.priority} onValueChange={(v) => v && patchField("priority", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <PriorityBadge priority={task.priority} />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Due Date</p>
                {isAdmin ? (
                  <Input
                    type="date"
                    defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onBlur={(e) => patchField("dueDate", e.target.value || null)}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-sm text-slate-700">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Client</p>
                  <Select
                    value={task.clientId != null ? String(task.clientId) : ""}
                    onValueChange={(v) => patchField("clientId", v ? Number(v) : null)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isAdmin && task.client && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Client</p>
                  <p className="text-sm text-slate-700">{task.client.companyName}</p>
                </div>
              )}
            </div>

            {/* ── Assigned To (multi-member) ──────────────────────────── */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Assigned To</p>

              {/* Member chips */}
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full pl-1 pr-2 py-0.5"
                    >
                      <Avatar name={m.name} url={m.avatarUrl} size={5} />
                      <span className="text-xs font-medium text-slate-700">{m.name}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                          aria-label={`Remove ${m.name}`}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-2">Unassigned</p>
              )}

              {/* Add member dropdown (admin only) */}
              {isAdmin && (
                <div className="relative" ref={memberDropRef}>
                  <button
                    type="button"
                    onClick={() => setMemberDropOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add member
                  </button>

                  {memberDropOpen && (
                    <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[220px] max-h-52 overflow-y-auto py-1">
                      {availableUsers.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-slate-400 text-center">All members added</p>
                      ) : (
                        availableUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => addMember(u.id)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 text-left transition-colors"
                          >
                            <Avatar name={u.name} url={u.avatarUrl} size={6} />
                            <span className="text-xs font-medium text-slate-700">{u.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-tasks */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Sub-Tasks ({task.subTasks.length})</p>
              <div className="space-y-1.5">
                {task.subTasks.map((sub) => (
                  <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sub.status === "DONE"}
                      onChange={() => toggleSubTask(sub.uuid, sub.status)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                    <span className={`text-sm flex-1 ${sub.status === "DONE" ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {sub.title}
                    </span>
                    <PriorityBadge priority={sub.priority} size="xs" />
                  </label>
                ))}
              </div>
              <form onSubmit={addSubTask} className="flex gap-2 mt-2">
                <Input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  placeholder="Add sub-task…"
                  className="h-8 text-xs flex-1"
                />
                <Button type="submit" disabled={addingSub || !subInput.trim()} size="sm" className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white">
                  Add
                </Button>
              </form>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600">Attachments ({task.attachments.length})</p>
                <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  Upload
                  <input ref={fileRef} type="file" className="hidden" onChange={handleAttachment} />
                </label>
              </div>
              {task.attachments.length === 0 ? (
                <p className="text-xs text-slate-400">No attachments yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {task.attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <a href={`${apiBase}/${att.filePath}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline font-medium truncate">
                        {att.fileName}
                      </a>
                      <button onClick={() => deleteAttachment(att.id)} className="text-xs text-red-500 hover:text-red-700 shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">Comments ({task.comments.length})</p>
              <div className="space-y-3">
                {task.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.user.name} url={c.user.avatarUrl} size={7} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{c.user.name}</span>
                        <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                        {(c.userId === user?.id || isAdmin) && (
                          <button onClick={() => deleteComment(c.id)} className="text-[11px] text-red-400 hover:text-red-600 ml-auto">Delete</button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleComment} className="flex gap-2 mt-3">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                  className="h-9 text-sm flex-1"
                />
                <Button type="submit" disabled={commenting || !comment.trim()} size="sm" className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
                  {commenting ? "…" : "Post"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-400">
            {task ? `Created ${timeAgo(task.createdAt)} · Updated ${timeAgo(task.updatedAt ?? task.createdAt)}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
