"use client";

import { useState } from "react";
import { LogOut, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

const EXIT_TYPES = [
  { value: "resignation",  label: "Resignation" },
  { value: "termination",  label: "Termination" },
  { value: "retirement",   label: "Retirement" },
  { value: "contract_end", label: "Contract End" },
  { value: "mutual",       label: "Mutual Separation" },
  { value: "absconding",   label: "Absconding" },
  { value: "other",        label: "Other" },
];

const SETTLEMENT_STATUSES = [
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed",  label: "Completed" },
];

const EXIT_STATUSES = ["NOTICE_PERIOD", "RESIGNED", "TERMINATED"];

function Row({ label, value }: { label: string; value?: string | number | null | boolean }) {
  const display = value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{display}</p>
    </div>
  );
}

export function TabExit({ employee, uuid, refetch, canEdit }: DetailTabProps) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lastWorkingDate: "",
    exitReason: "",
    exitType: "resignation",
    settlementStatus: "pending",
    rehireEligible: "true",
    exitNotes: "",
  });

  const isExitStatus = EXIT_STATUSES.includes(employee.status);
  const hasExitData  = !!(employee.lastWorkingDate || employee.exitReason || employee.exitType);

  function openEdit() {
    setForm({
      lastWorkingDate: employee.lastWorkingDate  ?? "",
      exitReason:      employee.exitReason        ?? "",
      exitType:        employee.exitType          ?? "resignation",
      settlementStatus: employee.settlementStatus ?? "pending",
      rehireEligible:  String(employee.rehireEligible ?? true),
      exitNotes:       employee.exitNotes         ?? "",
    });
    setOpen(true);
  }

  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/employees/${uuid}/exit`, {
        lastWorkingDate:  form.lastWorkingDate  || null,
        exitReason:       form.exitReason        || null,
        exitType:         form.exitType          || null,
        settlementStatus: form.settlementStatus  || null,
        rehireEligible:   form.rehireEligible === "true",
        exitNotes:        form.exitNotes        || null,
      });
      toast.success("Exit details saved");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isExitStatus && !hasExitData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <LogOut className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">No Exit Information</p>
        <p className="text-xs text-muted-foreground mt-1">
          Exit details are available when an employee is in Notice Period, Resigned, or Terminated status.
        </p>
      </div>
    );
  }

  const settlementLabel = SETTLEMENT_STATUSES.find(s => s.value === employee.settlementStatus)?.label;
  const exitTypeLabel   = EXIT_TYPES.find(t => t.value === employee.exitType)?.label;

  return (
    <div className="space-y-4">
      {isExitStatus && canEdit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={openEdit}>
            <Pencil className="w-3 h-3" /> Edit Exit Details
          </Button>
        </div>
      )}

      {!hasExitData && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Exit details have not been filled in yet.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <LogOut className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground">Exit Details</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <Row label="Exit Type"          value={exitTypeLabel ?? employee.exitType} />
          <Row label="Last Working Date"  value={fmt(employee.lastWorkingDate)} />
          <Row label="Settlement Status"  value={settlementLabel ?? employee.settlementStatus} />
          <Row label="Rehire Eligible"    value={employee.rehireEligible} />
          <div className="col-span-2">
            <Row label="Exit Reason"      value={employee.exitReason} />
          </div>
          {employee.exitNotes && (
            <div className="col-span-2">
              <Row label="Notes"          value={employee.exitNotes} />
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={save} className="p-1 space-y-4">
            <h3 className="text-sm font-semibold">Edit Exit Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Exit Type</Label>
                <Select value={form.exitType} onValueChange={v => sf("exitType", v ?? "resignation")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXIT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Working Date</Label>
                <Input type="date" className="h-9 text-sm" value={form.lastWorkingDate}
                  onChange={e => sf("lastWorkingDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Settlement Status</Label>
                <Select value={form.settlementStatus} onValueChange={v => sf("settlementStatus", v ?? "pending")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETTLEMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rehire Eligible</Label>
                <Select value={form.rehireEligible} onValueChange={v => sf("rehireEligible", v ?? "true")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true"  className="text-sm">Yes</SelectItem>
                    <SelectItem value="false" className="text-sm">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Exit Reason</Label>
                <Textarea className="text-sm resize-none" rows={2} placeholder="Reason for leaving"
                  value={form.exitReason} onChange={e => sf("exitReason", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea className="text-sm resize-none" rows={2} placeholder="Internal notes"
                  value={form.exitNotes} onChange={e => sf("exitNotes", e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="h-9 text-sm">
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
