"use client";

// src/components/modules/tasks/AddTaskModal.tsx

import { useState, useEffect } from "react";
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

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultStatus?: string;
}

export function AddTaskModal({ open, onClose, onCreated, defaultStatus = "TODO" }: Props) {
  const { user } = useAuthStore();
  const isEmployee = user?.role === "EMPLOYEE";

  const [form, setForm] = useState({
    title: "", description: "", status: defaultStatus,
    priority: "MEDIUM", dueDate: "", assignedToId: "", clientId: "",
  });
  const [users, setUsers]     = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, status: defaultStatus }));
    setError("");
    if (!isEmployee) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } })
        .then((r) => setUsers(r.data.data)).catch(() => {});
    }
    api.get<ApiResponse<Client[]>>("/clients", { params: { status: "ACTIVE" } })
      .then((r) => setClients(r.data.data)).catch(() => {});
  }, [open, defaultStatus, isEmployee]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        clientId:    form.clientId  ? Number(form.clientId)  : null,
      });
      onCreated();
      onClose();
      setForm({ title: "", description: "", status: defaultStatus, priority: "MEDIUM", dueDate: "", assignedToId: "", clientId: "" });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create task"
      );
    } finally {
      setLoading(false);
    }
  }

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
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["TODO","IN_PROGRESS","IN_REVIEW","DONE"].map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s.replace("_"," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v ?? "MEDIUM")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW","MEDIUM","HIGH","URGENT"].map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="h-9 text-sm" />
            </div>
            {!isEmployee && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Assign To</Label>
                <Select value={form.assignedToId} onValueChange={(v) => set("assignedToId", v ?? "")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-sm">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-sm">{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Link to Client</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v ?? "")}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No client" /></SelectTrigger>
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
