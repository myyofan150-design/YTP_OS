"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PayrollRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, RefreshCw, CheckCircle, DollarSign } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

function statusColor(s: string) {
  if (s === "PAID")     return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "APPROVED") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function AdjustDialog({
  record,
  onClose,
  onSaved,
}: {
  record: PayrollRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bonus, setBonus]         = useState(String(record.bonus ?? 0));
  const [deduction, setDeduction] = useState(String(record.otherDeduction ?? 0));
  const [notes, setNotes]         = useState(record.notes ?? "");
  const [saving, setSaving]       = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/payroll/${record.id}`, {
        bonus:          parseFloat(bonus)     || 0,
        otherDeduction: parseFloat(deduction) || 0,
        notes,
      });
      onSaved();
      onClose();
    } catch {
      alert("Failed to save adjustments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Bonus (₹)</Label>
            <Input type="number" min="0" value={bonus} onChange={e => setBonus(e.target.value)} />
          </div>
          <div>
            <Label>Other Deduction (₹)</Label>
            <Input type="number" min="0" value={deduction} onChange={e => setDeduction(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/85 text-primary-foreground">
            {saving && <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollPage() {
  const { user } = useAuth();
  const isHR = user?.role && ["SUPER_ADMIN","ADMIN","HR","ACCOUNTANT"].includes(user.role);

  const now = new Date();
  const [month, setMonth]      = useState(String(now.getMonth() + 1));
  const [year, setYear]        = useState(String(now.getFullYear()));
  const [records, setRecords]  = useState<PayrollRecord[]>([]);
  const [loading, setLoading]  = useState(false);
  const [generating, setGen]   = useState(false);
  const [adjusting, setAdjust] = useState<PayrollRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/payroll", { params: { month, year } });
      setRecords(res.data.data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function generateBatch() {
    if (!confirm(`Generate payroll for all active employees for ${MONTHS[parseInt(month)-1]} ${year}?`)) return;
    setGen(true);
    try {
      const res = await api.post("/payroll/generate-batch", { month: parseInt(month), year: parseInt(year) });
      const { generated, skipped } = res.data.data;
      alert(`Done: ${generated} generated, ${skipped} skipped`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed";
      alert(msg);
    } finally {
      setGen(false);
    }
  }

  async function approve(id: number) {
    try {
      await api.patch(`/payroll/${id}/approve`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed";
      alert(msg);
    }
  }

  async function markPaid(id: number) {
    try {
      await api.patch(`/payroll/${id}/mark-paid`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed";
      alert(msg);
    }
  }

  async function downloadPayslip(id: number, code: string) {
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Payslip not available yet");
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 animate-fade-in delay-100">
        <Select value={month} onValueChange={v => setMonth(v ?? month)}>
          <SelectTrigger className="h-9 w-44 text-sm"><span className="text-muted-foreground mr-1 shrink-0">Month:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i+1} value={String(i+1)} className="text-sm">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={v => setYear(v ?? year)}>
          <SelectTrigger className="h-9 w-36 text-sm"><span className="text-muted-foreground mr-1 shrink-0">Year:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map(y => (
              <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isHR && (
          <Button
            onClick={generateBatch}
            disabled={generating}
            className="ml-auto h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground"
          >
            {generating
              ? <><span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin mr-2" />Generating...</>
              : <><RefreshCw className="h-4 w-4 mr-2" />Generate All</>
            }
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No payroll records for {MONTHS[parseInt(month)-1]} {year}
            {isHR && <p className="text-sm mt-1">Click &quot;Generate All&quot; to create them</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                {isHR && <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Working Days</th>}
                {isHR && <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Present</th>}
                {isHR && <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">LOP</th>}
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Salary</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {rec.employee?.user.name ?? `Employee #${rec.employeeId}`}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{rec.employee?.employeeCode}</div>
                  </td>
                  {isHR && <td className="px-4 py-3 text-right text-muted-foreground">{rec.workingDays}</td>}
                  {isHR && <td className="px-4 py-3 text-right text-muted-foreground">{Number(rec.presentDays).toFixed(1)}</td>}
                  {isHR && (
                    <td className="px-4 py-3 text-right">
                      <span className={Number(rec.lopDays) > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>
                        {Number(rec.lopDays).toFixed(1)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-muted-foreground">₹{fmt(Number(rec.grossSalary))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">₹{fmt(Number(rec.netSalary))}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`${statusColor(rec.status)} border text-xs`}>
                      {rec.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isHR && rec.status === "DRAFT" && (
                        <Button size="sm" variant="outline" onClick={() => setAdjust(rec)} className="h-7 text-xs">
                          Adjust
                        </Button>
                      )}
                      {isHR && rec.status === "DRAFT" && (
                        <Button size="sm" variant="outline" onClick={() => approve(rec.id)} className="h-7 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                        </Button>
                      )}
                      {isHR && rec.status === "APPROVED" && (
                        <Button size="sm" onClick={() => markPaid(rec.id)} className="h-7 text-xs bg-primary hover:bg-primary/85 text-primary-foreground">
                          <DollarSign className="h-3.5 w-3.5 mr-1" />Mark Paid
                        </Button>
                      )}
                      {rec.status !== "DRAFT" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadPayslip(rec.id, rec.employee?.employeeCode ?? String(rec.id))}
                          className="h-7 w-7 p-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjusting && (
        <AdjustDialog
          record={adjusting}
          onClose={() => setAdjust(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
