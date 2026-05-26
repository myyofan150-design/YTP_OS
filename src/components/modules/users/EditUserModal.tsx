"use client";

// src/components/modules/users/EditUserModal.tsx
// Modal to edit a user's name, email, role, and status.

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
import type { User } from "@/types";

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN",       label: "Admin" },
  { value: "HR",          label: "HR" },
  { value: "TEAM_LEAD",   label: "Team Lead" },
  { value: "EMPLOYEE",    label: "Employee" },
  { value: "ACCOUNTANT",  label: "Accountant" },
];

interface Props {
  user: User | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditUserModal({ user, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, role: user.role });
  }, [user]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.put(`/users/${user!.id}`, form);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to update user"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-medium text-slate-700">Full name</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="text-xs font-medium text-slate-700">Email address</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v ?? "EMPLOYEE")}>
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
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
