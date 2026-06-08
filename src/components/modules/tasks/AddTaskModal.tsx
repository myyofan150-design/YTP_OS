"use client";

// src/components/modules/tasks/AddTaskModal.tsx

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { User, Client, ApiResponse } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done", CANCELLED: "Cancelled",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultStatus?: string;
}

function MemberAvatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
    );
  }
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-orange-400", "bg-teal-500", "bg-purple-500", "bg-blue-500", "bg-pink-400"];
  const bg = colors[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  return (
    <div className={`w-5 h-5 rounded-full ${bg} text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export function AddTaskModal({ open, onClose, onCreated, defaultStatus = "TODO" }: Props) {
  const { user } = useAuthStore();
  const isEmployee = user?.role === "EMPLOYEE";

  const [form, setForm] = useState({
    title: "", description: "", status: defaultStatus,
    priority: "MEDIUM", dueDate: "", memberIds: [] as number[], clientId: "",
  });
  const [users, setUsers]       = useState<User[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [memberDropOpen, setMemberDropOpen] = useState(false);
  const memberDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, status: defaultStatus, memberIds: [] }));
    setError("");
    if (!isEmployee) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } })
        .then((r) => setUsers(r.data.data)).catch(() => {});
    }
    api.get<ApiResponse<Client[]>>("/clients", { params: { status: "ACTIVE" } })
      .then((r) => setClients(r.data.data)).catch(() => {});
  }, [open, defaultStatus, isEmployee]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (memberDropRef.current && !memberDropRef.current.contains(e.target as Node)) {
        setMemberDropOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addMember(userId: number) {
    setForm((f) => ({ ...f, memberIds: [...f.memberIds, userId] }));
    setMemberDropOpen(false);
  }

  function removeMember(userId: number) {
    setForm((f) => ({ ...f, memberIds: f.memberIds.filter((id) => id !== userId) }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/tasks", {
        title:       form.title.trim(),
        description: form.description || null,
        status:      form.status,
        priority:    form.priority,
        dueDate:     form.dueDate || null,
        memberIds:   form.memberIds,
        clientId:    form.clientId ? Number(form.clientId) : null,
      });
      onCreated();
      onClose();
      setForm({ title: "", description: "", status: defaultStatus, priority: "MEDIUM", dueDate: "", memberIds: [], clientId: "" });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create task"
      );
    } finally {
      setLoading(false);
    }
  }

  const availableUsers = users.filter((u) => !form.memberIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="h-9 text-sm" placeholder="What needs to be done?" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Add more details…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v ?? "TODO")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue>{(v: string) => STATUS_LABELS[v] ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  {["TODO","IN_PROGRESS","IN_REVIEW","DONE","CANCELLED"].map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v ?? "MEDIUM")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue>{(v: string) => PRIORITY_LABELS[v] ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  {["LOW","MEDIUM","HIGH","URGENT"].map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="h-9 text-sm w-full" />
          </div>

          {/* ── Assign To (multi-member picker) ─────────────────────── */}
          {!isEmployee && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Assign To</Label>

              {/* Selected member chips */}
              {form.memberIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.memberIds.map((id) => {
                    const u = users.find((u) => u.id === id);
                    if (!u) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full pl-1 pr-2 py-0.5"
                      >
                        <MemberAvatar name={u.name} url={u.avatarUrl} />
                        <span className="text-xs font-medium text-slate-700">{u.name}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(u.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${u.name}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Add member dropdown */}
              <div className="relative" ref={memberDropRef}>
                <button
                  type="button"
                  onClick={() => setMemberDropOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors w-full"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
                  </svg>
                  {form.memberIds.length === 0 ? "Select members…" : "Add another member"}
                </button>

                {memberDropOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto py-1">
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
                          <MemberAvatar name={u.name} url={u.avatarUrl} />
                          <span className="text-sm font-medium text-slate-700">{u.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Link to Client</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v ?? "")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue>{(v: string) => v ? (clients.find(c => String(c.id) === v)?.companyName ?? v) : "No client"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-sm">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-sm">{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
              {loading ? "Creating…" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
