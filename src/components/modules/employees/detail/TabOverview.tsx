"use client";

import { useEffect, useState, useRef } from "react";
import {
  CalendarDays, ChevronDown, ChevronUp, Clock, Laptop, Plus, Briefcase,
  Activity, RotateCcw, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import type { EmployeeAsset, StatusHistoryEntry, ApiResponse } from "@/types";
import type { DetailTabProps } from "./types";
import { fmt, fmtMoney } from "./types";
import { EmpStatusBadge } from "../EmpStatusBadge";

interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  createdAt: string;
  user?: { name: string } | null;
}

const ASSET_TYPES = ["Laptop", "Mobile / SIM", "ID Card", "Access Card", "Headset", "Monitor", "Other"];

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function TabOverview({ employee, uuid, refetch, canEdit, apiBase }: DetailTabProps) {
  const [activity, setActivity]       = useState<ActivityLog[]>([]);
  const [history, setHistory]         = useState<StatusHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetForm, setAssetForm]     = useState({
    assetName: "", assetType: "Laptop", assignedDate: "", serialNumber: "", notes: "",
  });

  useEffect(() => {
    api.get<ApiResponse<ActivityLog[]>>(`/activity-logs?entityType=employee&entityId=${employee.id}&limit=5`)
      .then(r => setActivity(r.data.data ?? []))
      .catch(() => {});
    api.get<ApiResponse<StatusHistoryEntry[]>>(`/employees/${uuid}/status-history`)
      .then(r => setHistory(r.data.data ?? []))
      .catch(() => {});
  }, [employee.id, uuid]);

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetForm.assetName.trim()) return;
    setSavingAsset(true);
    try {
      await api.post(`/employees/${uuid}/assets`, {
        assetName: assetForm.assetName,
        assetType: assetForm.assetType || null,
        assignedDate: assetForm.assignedDate || null,
        serialNumber: assetForm.serialNumber || null,
        notes: assetForm.notes || null,
      });
      toast.success("Asset assigned");
      setAddAssetOpen(false);
      setAssetForm({ assetName: "", assetType: "Laptop", assignedDate: "", serialNumber: "", notes: "" });
      refetch();
    } catch {
      toast.error("Failed to add asset");
    } finally {
      setSavingAsset(false);
    }
  }

  async function markReturned(assetUuid: string) {
    try {
      await api.patch(`/employees/${uuid}/assets/${assetUuid}/return`);
      toast.success("Asset marked as returned");
      refetch();
    } catch {
      toast.error("Failed to update asset");
    }
  }

  const joining = employee.joiningDate ? new Date(employee.joiningDate) : null;
  const daysAtCompany = joining
    ? Math.floor((Date.now() - joining.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const lb = employee.leaveBalance;
  const leaveRemaining = lb
    ? Math.max(lb.casualTotal - lb.casualUsed, 0)
      + Math.max(lb.sickTotal - lb.sickUsed, 0)
      + Math.max(lb.paidTotal - lb.paidUsed, 0)
      + Number(lb.compOff)
    : 0;

  const docsUploaded = employee.documents.length;
  const activeAssets = (employee.assets ?? []).filter(a => !a.returnDate);

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Days at Company"
          value={daysAtCompany.toLocaleString("en-IN")}
          sub={fmt(employee.joiningDate)}
          icon={CalendarDays}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Leave Remaining"
          value={leaveRemaining}
          sub="days this year"
          icon={Clock}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Documents"
          value={docsUploaded}
          sub={`${employee.documents.filter(d => d.isMandatory).length} mandatory`}
          icon={Briefcase}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Active Assets"
          value={activeAssets.length}
          sub={activeAssets.map(a => a.assetType ?? a.assetName).slice(0, 2).join(", ") || "none"}
          icon={Laptop}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Employment summary */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground">Employment Summary</p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ["Employee Code",  employee.employeeCode],
            ["Employee Type",  employee.employeeType?.replace("_", " ") ?? "—"],
            ["Joining Date",   fmt(employee.joiningDate)],
            ["Work Mode",      employee.workMode ?? "—"],
            ["Shift",          employee.shiftStart && employee.shiftEnd ? `${employee.shiftStart} – ${employee.shiftEnd}` : "—"],
            ["Base Salary",    fmtMoney(employee.baseSalary)],
            ["Department",     employee.department ?? "—"],
            ["Designation",    employee.designation ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-sm text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assets */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Laptop className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground flex-1">Assigned Assets</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => setAddAssetOpen(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          )}
        </div>
        <div className="px-5 divide-y divide-border/50">
          {(employee.assets ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No assets assigned.</p>
          ) : (
            (employee.assets ?? []).map(asset => (
              <div key={asset.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{asset.assetName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {asset.assetType ?? "—"} · Assigned {fmt(asset.assignedDate)}
                    {asset.serialNumber ? ` · SN: ${asset.serialNumber}` : ""}
                  </p>
                </div>
                {asset.returnDate ? (
                  <span className="text-xs text-muted-foreground">Returned {fmt(asset.returnDate)}</span>
                ) : (
                  canEdit && asset.uuid && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs px-2.5 text-muted-foreground"
                      onClick={() => markReturned(asset.uuid!)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Return
                    </Button>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </span>
          <p className="text-xs font-semibold text-foreground">Recent Activity</p>
        </div>
        <div className="px-5 divide-y divide-border/50">
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            activity.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {log.user?.name ?? "System"} · {fmt(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status history */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
          onClick={() => setHistoryOpen(v => !v)}
        >
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
          <p className="text-xs font-semibold text-foreground flex-1 text-left">Status History</p>
          {historyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {historyOpen && (
          <div className="border-t border-border overflow-x-auto">
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No status changes recorded.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/20">
                  <tr>
                    {["Date", "From", "To", "Changed By", "Reason"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 text-muted-foreground">{fmt(h.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        {h.fromStatus ? <EmpStatusBadge status={h.fromStatus} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5"><EmpStatusBadge status={h.toStatus} /></td>
                      <td className="px-4 py-2.5 text-foreground">{h.changedByUser?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{h.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add asset dialog */}
      <Dialog open={addAssetOpen} onOpenChange={setAddAssetOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addAsset} className="p-1 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Assign Asset</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Asset Name *</Label>
                <Input className="h-9 text-sm" placeholder='e.g. MacBook Pro 14"' value={assetForm.assetName}
                  onChange={e => setAssetForm(p => ({ ...p, assetName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Type</Label>
                <Select value={assetForm.assetType} onValueChange={v => setAssetForm(p => ({ ...p, assetType: v ?? "Laptop" }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Date</Label>
                <Input type="date" className="h-9 text-sm" value={assetForm.assignedDate}
                  onChange={e => setAssetForm(p => ({ ...p, assignedDate: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Serial Number</Label>
                <Input className="h-9 text-sm" placeholder="Optional" value={assetForm.serialNumber}
                  onChange={e => setAssetForm(p => ({ ...p, serialNumber: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={savingAsset} className="h-9 text-sm">
                {savingAsset ? "Saving…" : "Assign Asset"}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => setAddAssetOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
