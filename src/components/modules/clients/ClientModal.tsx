"use client";

// src/components/modules/clients/ClientModal.tsx
// Add / Edit client modal.

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
import type { Client } from "@/types";

const STATUSES = [
  { value: "ACTIVE",   label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "ON_HOLD",  label: "On Hold" },
  { value: "CHURNED",  label: "Churned" },
];

const CONTRACT_TYPES = [
  { value: "MONTHLY",   label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL",    label: "Annual" },
  { value: "PROJECT",   label: "Project" },
];

const EMPTY_FORM = {
  companyName:   "",
  contactPerson: "",
  email:         "",
  phone:         "",
  address:       "",
  gstNumber:     "",
  status:        "ACTIVE",
  contractType:  "MONTHLY",
  monthlyFee:    "",
  contractStart: "",
  contractEnd:   "",
  notes:         "",
};

interface Props {
  client: Client | null;     // null = add mode, Client = edit mode
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ClientModal({ client, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        companyName:   client.companyName,
        contactPerson: client.contactPerson,
        email:         client.email ?? "",
        phone:         client.phone ?? "",
        address:       client.address ?? "",
        gstNumber:     client.gstNumber ?? "",
        status:        client.status,
        contractType:  client.contractType,
        monthlyFee:    client.monthlyFee != null ? String(client.monthlyFee) : "",
        contractStart: client.contractStart ? client.contractStart.slice(0, 10) : "",
        contractEnd:   client.contractEnd   ? client.contractEnd.slice(0, 10)   : "",
        notes:         client.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [client, open]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        companyName:   form.companyName,
        contactPerson: form.contactPerson,
        email:         form.email         || null,
        phone:         form.phone         || null,
        address:       form.address       || null,
        gstNumber:     form.gstNumber     || null,
        status:        form.status,
        contractType:  form.contractType,
        monthlyFee:    form.monthlyFee    ? Number(form.monthlyFee) : null,
        contractStart: form.contractStart || null,
        contractEnd:   form.contractEnd   || null,
        notes:         form.notes         || null,
      };

      if (client) {
        await api.patch(`/clients/${client.uuid}`, body);
      } else {
        await api.post("/clients", body);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to save client"
      );
    } finally {
      setLoading(false);
    }
  }

  const isEdit = !!client;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">
            {isEdit ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Company & Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-company" className="text-xs font-medium text-slate-700">Company name *</Label>
              <Input
                id="cm-company"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-contact" className="text-xs font-medium text-slate-700">Contact person *</Label>
              <Input
                id="cm-contact"
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-email" className="text-xs font-medium text-slate-700">Email</Label>
              <Input
                id="cm-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-phone" className="text-xs font-medium text-slate-700">Phone</Label>
              <Input
                id="cm-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Address & GST */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-address" className="text-xs font-medium text-slate-700">Address</Label>
              <Input
                id="cm-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-gst" className="text-xs font-medium text-slate-700">GST Number</Label>
              <Input
                id="cm-gst"
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Status & Contract Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v ?? "ACTIVE")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Contract Type</Label>
              <Select value={form.contractType} onValueChange={(v) => set("contractType", v ?? "MONTHLY")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly Fee & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-fee" className="text-xs font-medium text-slate-700">Monthly Fee (₹)</Label>
              <Input
                id="cm-fee"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyFee}
                onChange={(e) => set("monthlyFee", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-start" className="text-xs font-medium text-slate-700">Contract Start</Label>
              <Input
                id="cm-start"
                type="date"
                value={form.contractStart}
                onChange={(e) => set("contractStart", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-end" className="text-xs font-medium text-slate-700">Contract End</Label>
              <Input
                id="cm-end"
                type="date"
                value={form.contractEnd}
                onChange={(e) => set("contractEnd", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cm-notes" className="text-xs font-medium text-slate-700">Notes</Label>
            <textarea
              id="cm-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
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
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
