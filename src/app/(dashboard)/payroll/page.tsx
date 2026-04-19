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
import { Download, RefreshCw, CheckCircle, DollarSign, Loader2 } from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

function statusColor(s: string) {
  if (s === "PAID")     return "bg-green-100 text-green-800";
  if (s === "APPROVED") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

// ─── Adjust Dialog ────────────────────────────────────────────────────────────

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
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage monthly employee payroll</p>
        </div>
        {isHR && (
          <Button onClick={generateBatch} disabled={generating}>
            {generating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              : <><RefreshCw className="h-4 w-4 mr-2" />Generate All</>
            }
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={month} onValueChange={v => setMonth(v ?? month)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={v => setYear(v ?? year)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No payroll records for {MONTHS[parseInt(month)-1]} {year}
            {isHR && <p className="text-sm mt-1">Click &quot;Generate All&quot; to create them</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                {isHR && <th className="text-right px-4 py-3 font-semibold text-gray-600">Working Days</th>}
                {isHR && <th className="text-right px-4 py-3 font-semibold text-gray-600">Present</th>}
                {isHR && <th className="text-right px-4 py-3 font-semibold text-gray-600">LOP</th>}
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Gross</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Net Salary</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(rec => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {rec.employee?.user.name ?? `Employee #${rec.employeeId}`}
                    </div>
                    <div className="text-xs text-gray-500">{rec.employee?.employeeCode}</div>
                  </td>
                  {isHR && <td className="px-4 py-3 text-right text-gray-700">{rec.workingDays}</td>}
                  {isHR && <td className="px-4 py-3 text-right text-gray-700">{Number(rec.presentDays).toFixed(1)}</td>}
                  {isHR && (
                    <td className="px-4 py-3 text-right">
                      <span className={Number(rec.lopDays) > 0 ? "text-red-600 font-medium" : "text-gray-700"}>
                        {Number(rec.lopDays).toFixed(1)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-gray-700">₹{fmt(Number(rec.grossSalary))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{fmt(Number(rec.netSalary))}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`${statusColor(rec.status)} border-0 text-xs`}>
                      {rec.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isHR && rec.status === "DRAFT" && (
                        <Button size="sm" variant="outline" onClick={() => setAdjust(rec)}>
                          Adjust
                        </Button>
                      )}
                      {isHR && rec.status === "DRAFT" && (
                        <Button size="sm" variant="outline" onClick={() => approve(rec.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                        </Button>
                      )}
                      {isHR && rec.status === "APPROVED" && (
                        <Button size="sm" onClick={() => markPaid(rec.id)}>
                          <DollarSign className="h-3.5 w-3.5 mr-1" />Mark Paid
                        </Button>
                      )}
                      {rec.status !== "DRAFT" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadPayslip(rec.id, rec.employee?.employeeCode ?? String(rec.id))}
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
