"use client";

// src/components/modules/users/AddUserModal.tsx

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "ADMIN",      label: "Admin" },
  { value: "HR",         label: "HR" },
  { value: "TEAM_LEAD",  label: "Team Lead" },
  { value: "EMPLOYEE",   label: "Employee" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "CLIENT",     label: "Client" },
];

interface ClientOption { id: number; companyName: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddUserModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", clientId: "" });
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [clients, setClients]       = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Load active clients when CLIENT role is selected
  useEffect(() => {
    if (form.role !== "CLIENT") return;
    setClientsLoading(true);
    api.get("/clients", { params: { status: "ACTIVE", limit: 200 } })
      .then(r => {
        const list = (r.data.data?.clients ?? r.data.data) as Array<{ id: number; companyName: string }>;
        setClients(list.map(c => ({ id: c.id, companyName: c.companyName })));
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, [form.role]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    if (form.role === "CLIENT" && !form.clientId) {
      setError("Please select a client company for this user.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/users", {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
        ...(form.role === "CLIENT" && form.clientId ? { clientId: Number(form.clientId) } : {}),
      });
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE", clientId: "" });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">Add New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-name" className="text-xs font-medium text-slate-700">Full name</Label>
            <Input
              id="add-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Smith"
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email" className="text-xs font-medium text-slate-700">Email address</Label>
            <Input
              id="add-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@agencyos.com"
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-password" className="text-xs font-medium text-slate-700">
              Password <span className="text-slate-400">(min 8 characters)</span>
            </Label>
            <Input
              id="add-password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Role</Label>
            <Select value={form.role} onValueChange={(v) => { set("role", v ?? "EMPLOYEE"); set("clientId", ""); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-sm">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client picker — only shown when CLIENT role is selected */}
          {form.role === "CLIENT" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Client Company <span className="text-red-500">*</span>
              </Label>
              {clientsLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading clients…</p>
              ) : (
                <Select value={form.clientId} onValueChange={(v) => set("clientId", v ?? "")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-sm">
                        {c.companyName}
                      </SelectItem>
                    ))}
                    {clients.length === 0 && (
                      <SelectItem value="_none" disabled className="text-sm text-muted-foreground">
                        No active clients found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                This user will see only data for the selected client.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
            >
              {loading ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
