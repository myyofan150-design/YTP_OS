"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmpStatusBadge } from "@/components/modules/employees/EmpStatusBadge";

import { TabOverview }    from "@/components/modules/employees/detail/TabOverview";
import { TabPersonal }    from "@/components/modules/employees/detail/TabPersonal";
import { TabJob }         from "@/components/modules/employees/detail/TabJob";
import { TabSalary }      from "@/components/modules/employees/detail/TabSalary";
import { TabBankTax }     from "@/components/modules/employees/detail/TabBankTax";
import { TabAttendance }  from "@/components/modules/employees/detail/TabAttendance";
import { TabLeave }       from "@/components/modules/employees/detail/TabLeave";
import { TabPayroll }     from "@/components/modules/employees/detail/TabPayroll";
import { TabDocuments }   from "@/components/modules/employees/detail/TabDocuments";
import { TabAgreements }  from "@/components/modules/employees/detail/TabAgreements";
import { TabAccess }      from "@/components/modules/employees/detail/TabAccess";
import { TabExit }        from "@/components/modules/employees/detail/TabExit";

import type { EmployeeDetail, ApiResponse } from "@/types";

const HR_ROLES  = ["SUPER_ADMIN", "ADMIN", "HR"];
const FIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HR", "ACCOUNTANT"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "personal",   label: "Personal" },
  { id: "job",        label: "Job" },
  { id: "salary",     label: "Salary" },
  { id: "banktax",    label: "Bank & Tax" },
  { id: "attendance", label: "Attendance" },
  { id: "leave",      label: "Leave" },
  { id: "payroll",    label: "Payroll" },
  { id: "documents",  label: "Documents" },
  { id: "agreements", label: "Agreements" },
  { id: "access",     label: "Access" },
  { id: "exit",       label: "Exit" },
] as const;

type TabId = typeof TABS[number]["id"];

const STATUS_OPTIONS = [
  { value: "DRAFT",         label: "Draft" },
  { value: "ACTIVE",        label: "Active" },
  { value: "PROBATION",     label: "Probation" },
  { value: "NOTICE_PERIOD", label: "Notice Period" },
  { value: "RESIGNED",      label: "Resigned" },
  { value: "TERMINATED",    label: "Terminated" },
  { value: "INACTIVE",      label: "Inactive" },
  { value: "ARCHIVED",      label: "Archived" },
];

const EXIT_STATUSES = new Set(["NOTICE_PERIOD", "RESIGNED", "TERMINATED"]);

const EXIT_TYPES = [
  { value: "resignation",  label: "Resignation" },
  { value: "termination",  label: "Termination" },
  { value: "retirement",   label: "Retirement" },
  { value: "contract_end", label: "Contract End" },
  { value: "mutual",       label: "Mutual Separation" },
  { value: "absconding",   label: "Absconding" },
  { value: "other",        label: "Other" },
];

const apiBase = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

export default function EmployeeDetailPage() {
  const { uuid }  = useParams() as { uuid: string };
  const router    = useRouter();
  const { user }  = useAuthStore();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<TabId>("overview");

  // Status change dialog
  const [statusOpen, setStatusOpen]   = useState(false);
  const [statusForm, setStatusForm]   = useState({
    status: "", reason: "", lastWorkingDate: "", exitType: "resignation",
  });
  const [changingStatus, setChangingStatus] = useState(false);

const [avatarErr, setAvatarErr]   = useState(false);

  const canEdit   = HR_ROLES.includes(user?.role ?? "");
  const canSeeFin = FIN_ROLES.includes(user?.role ?? "");
  const isAdmin   = ADMIN_ROLES.includes(user?.role ?? "");

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<EmployeeDetail>>(`/employees/${uuid}`);
      setEmployee(res.data.data);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  function openStatusChange() {
    if (!employee) return;
    setStatusForm({
      status: employee.status,
      reason: "",
      lastWorkingDate: employee.lastWorkingDate ?? "",
      exitType: employee.exitType ?? "resignation",
    });
    setStatusOpen(true);
  }

  async function submitStatusChange(e: React.FormEvent) {
    e.preventDefault();
    setChangingStatus(true);
    try {
      const body: Record<string, string | null> = {
        status: statusForm.status,
        reason: statusForm.reason || null,
      };
      if (EXIT_STATUSES.has(statusForm.status)) {
        body.lastWorkingDate = statusForm.lastWorkingDate || null;
        body.exitType        = statusForm.exitType || null;
      }
      await api.patch(`/employees/${uuid}/status`, body);
      toast.success("Status updated");
      setStatusOpen(false);
      fetchEmployee();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to change status");
    } finally {
      setChangingStatus(false);
    }
  }

  const ssf = (k: string, v: string) => setStatusForm(p => ({ ...p, [k]: v }));

  // ── Shared tab props ──────────────────────────────────────────────────────
  const tabProps = employee
    ? { employee, uuid, refetch: fetchEmployee, canEdit, canSeeFin, isAdmin, userRole: user?.role ?? "", apiBase }
    : null;

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-sm text-muted-foreground">Employee not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const initials = employee.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-0">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Back */}
            <button
              onClick={() => router.push("/employees")}
              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Avatar */}
            {resolveAssetUrl(employee.user.avatarUrl) && !avatarErr ? (
              <img src={resolveAssetUrl(employee.user.avatarUrl)!} alt={employee.user.name}
                onError={() => setAvatarErr(true)}
                className="w-12 h-12 rounded-full object-cover border border-border shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-bold border border-border/50 shrink-0">
                {initials}
              </div>
            )}

            {/* Name + meta */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base font-bold text-foreground">{employee.user.name}</h1>
                <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">{employee.employeeCode}</span>
                <EmpStatusBadge status={employee.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[employee.designation, employee.department].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={fetchEmployee}>
              <RefreshCw className="w-3 h-3" />
            </Button>
{canEdit && (
              <Button size="sm" className="h-8 text-xs" onClick={openStatusChange}>
                Change Status
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card px-6 overflow-x-auto">
        <nav className="flex gap-0 min-w-max">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
              {t.id === "documents"  && employee.documents?.length   > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({employee.documents.length})</span>
              )}
              {t.id === "agreements" && employee.agreements?.length  > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({employee.agreements.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="p-6 animate-fade-up delay-100">
        {tabProps && tab === "overview"    && <TabOverview    {...tabProps} />}
        {tabProps && tab === "personal"    && <TabPersonal    {...tabProps} />}
        {tabProps && tab === "job"         && <TabJob         {...tabProps} />}
        {tabProps && tab === "salary"      && <TabSalary      {...tabProps} />}
        {tabProps && tab === "banktax"     && <TabBankTax     {...tabProps} />}
        {tabProps && tab === "attendance"  && <TabAttendance  {...tabProps} />}
        {tabProps && tab === "leave"       && <TabLeave       {...tabProps} />}
        {tabProps && tab === "payroll"     && <TabPayroll     {...tabProps} />}
        {tabProps && tab === "documents"   && <TabDocuments   {...tabProps} />}
        {tabProps && tab === "agreements"  && <TabAgreements  {...tabProps} />}
        {tabProps && tab === "access"      && <TabAccess      {...tabProps} />}
        {tabProps && tab === "exit"        && <TabExit        {...tabProps} />}
      </div>

      {/* ── Status Change Dialog ───────────────────────────────────────────── */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitStatusChange} className="p-1 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Change Employee Status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current: <span className="font-medium text-foreground">{employee.status.replace("_", " ")}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">New Status *</Label>
              <Select value={statusForm.status} onValueChange={v => ssf("status", v ?? employee.status)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason / Note</Label>
              <Textarea className="text-sm resize-none" rows={2} placeholder="Optional — e.g. Promotion, Resignation accepted, etc."
                value={statusForm.reason} onChange={e => ssf("reason", e.target.value)} />
            </div>

            {EXIT_STATUSES.has(statusForm.status) && (
              <>
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exit Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Last Working Date</Label>
                      <Input type="date" className="h-9 text-sm" value={statusForm.lastWorkingDate}
                        onChange={e => ssf("lastWorkingDate", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Exit Type</Label>
                      <Select value={statusForm.exitType} onValueChange={v => ssf("exitType", v ?? "resignation")}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXIT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={changingStatus || !statusForm.status} className="h-9 text-sm">
                {changingStatus ? "Saving…" : "Change Status"}
              </Button>
              <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => setStatusOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
