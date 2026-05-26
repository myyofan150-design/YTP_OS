"use client";

import { Palmtree, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { useState } from "react";
import type { DetailTabProps } from "./types";

interface BalanceBar {
  label: string;
  used: number;
  total: number;
  color: string;
  bg: string;
  text: string;
}

function LeaveBar({ label, used, total, color, bg, text }: BalanceBar) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">{used} used</span>
          <span className={`text-[11px] font-semibold ${text} px-2 py-0.5 rounded-full ${bg}`}>
            {remaining} left
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>{total} days total</span>
      </div>
    </div>
  );
}

export function TabLeave({ employee, uuid, refetch, canEdit }: DetailTabProps) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    casualTotal: "", sickTotal: "", paidTotal: "", compOff: "",
  });

  const lb = employee.leaveBalance;

  function openEdit() {
    setForm({
      casualTotal: String(lb?.casualTotal ?? 12),
      sickTotal:   String(lb?.sickTotal   ?? 6),
      paidTotal:   String(lb?.paidTotal   ?? 15),
      compOff:     String(lb?.compOff     ?? 0),
    });
    setOpen(true);
  }

  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/employees/${uuid}/leave-balance`, {
        casualTotal: Number(form.casualTotal) || 0,
        sickTotal:   Number(form.sickTotal)   || 0,
        paidTotal:   Number(form.paidTotal)   || 0,
        compOff:     Number(form.compOff)     || 0,
      });
      toast.success("Leave balance updated");
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const bars: BalanceBar[] = lb ? [
    { label: "Casual Leave",  used: Number(lb.casualUsed), total: Number(lb.casualTotal), color: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
    { label: "Sick Leave",    used: Number(lb.sickUsed),   total: Number(lb.sickTotal),   color: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700" },
    { label: "Paid Leave",    used: Number(lb.paidUsed),   total: Number(lb.paidTotal),   color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  ] : [];

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openEdit}>
            <Plus className="w-3 h-3" /> {lb ? "Edit Balance" : "Set Balance"}
          </Button>
        </div>
      )}

      {!lb ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Palmtree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No Leave Balance</p>
          <p className="text-xs text-muted-foreground mt-1">Leave balance has not been configured for this employee.</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="mt-3 text-xs h-8" onClick={openEdit}>Configure Now</Button>
          )}
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Casual",  used: Number(lb.casualUsed), total: Number(lb.casualTotal), color: "text-blue-600" },
              { label: "Sick",    used: Number(lb.sickUsed),   total: Number(lb.sickTotal),   color: "text-amber-600" },
              { label: "Paid",    used: Number(lb.paidUsed),   total: Number(lb.paidTotal),   color: "text-emerald-600" },
              { label: "Comp Off",used: 0,                     total: Number(lb.compOff),     color: "text-purple-600" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-border bg-card px-4 py-3.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-xl font-bold font-mono ${s.color}`}>{s.total - s.used}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.used} / {s.total} used</p>
              </div>
            ))}
          </div>

          {/* Balance bars */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Palmtree className="w-3.5 h-3.5 text-primary" />
              </span>
              <p className="text-xs font-semibold text-foreground flex-1">Leave Balance — {lb.year}</p>
            </div>
            <div className="p-5 space-y-5">
              {bars.map(b => <LeaveBar key={b.label} {...b} />)}
            </div>
          </div>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={save} className="p-1 space-y-4">
            <h3 className="text-sm font-semibold">Set Leave Entitlements</h3>
            <p className="text-xs text-muted-foreground">Total days allocated per year (used days are tracked separately).</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "casualTotal", label: "Casual Leave (days)" },
                { k: "sickTotal",   label: "Sick Leave (days)" },
                { k: "paidTotal",   label: "Paid Leave (days)" },
                { k: "compOff",     label: "Comp Off (days)" },
              ].map(({ k, label }) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" min={0} className="h-9 text-sm"
                    value={form[k as keyof typeof form]}
                    onChange={e => sf(k, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="h-9 text-sm">
                {saving ? "Saving…" : "Save Balance"}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
