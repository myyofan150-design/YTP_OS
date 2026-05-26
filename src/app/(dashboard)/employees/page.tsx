"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download, Printer, ChevronDown, ChevronUp, X, AlertTriangle,
  FileWarning, Calendar, MessageCircle, Mail, Eye, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { AddEmployeeWizard } from "@/components/modules/employees/AddEmployeeWizard";
import { EmpStatusBadge } from "@/components/modules/employees/EmpStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Employee, ApiResponse } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAN_CREATE = ["SUPER_ADMIN", "ADMIN", "HR"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

interface EmpStats {
  total: number; active: number; onProbation: number; onNoticePeriod: number;
  missingMandatoryDocs: number;
}

const QUICK_STATUSES = [
  { value: "ACTIVE",        label: "Active" },
  { value: "PROBATION",     label: "Probation" },
  { value: "NOTICE_PERIOD", label: "Notice Period" },
  { value: "RESIGNED",      label: "Resigned" },
  { value: "TERMINATED",    label: "Terminated" },
];

const WORK_MODE_STYLES: Record<string, string> = {
  office: "bg-blue-50 text-blue-700 border border-blue-200",
  remote: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  hybrid: "bg-purple-50 text-purple-700 border border-purple-200",
};

const TYPE_STYLES: Record<string, string> = {
  full_time:  "bg-slate-100 text-slate-600 border border-slate-200",
  contract:   "bg-amber-50 text-amber-700 border border-amber-200",
  internship: "bg-blue-50 text-blue-700 border border-blue-200",
  freelance:  "bg-orange-50 text-orange-700 border border-orange-200",
};

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", contract: "Contract",
  internship: "Internship", freelance: "Freelance",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolveAssetUrl(url);
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  if (src && !imgErr) return (
    <img src={src} alt={name} onError={() => setImgErr(true)}
      className="w-8 h-8 rounded-full object-cover shrink-0" />
  );
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

function WorkModeBadge({ mode }: { mode?: string | null }) {
  if (!mode) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${WORK_MODE_STYLES[mode] ?? "bg-muted text-muted-foreground"}`}>
      {mode.charAt(0).toUpperCase() + mode.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type?: string | null }) {
  if (!type) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Upcoming events (computed from loaded employees) ──────────────────────────

function getUpcomingBirthday(dob: string | null | undefined, days = 7): Date | null {
  if (!dob) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const bd    = new Date(dob);
  const thisY = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  const d = Math.round((thisY.getTime() - today.getTime()) / 86400000);
  if (d >= 0 && d <= days) return thisY;
  const nextY = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
  const d2 = Math.round((nextY.getTime() - today.getTime()) / 86400000);
  if (d2 >= 0 && d2 <= days) return nextY;
  return null;
}

function getUpcomingAnniversary(joiningDate: string, days = 7): { date: Date; years: number } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const join  = new Date(joiningDate);
  const years = today.getFullYear() - join.getFullYear();
  if (years <= 0) return null;
  const ann = new Date(today.getFullYear(), join.getMonth(), join.getDate());
  const d   = Math.round((ann.getTime() - today.getTime()) / 86400000);
  return d >= 0 && d <= days ? { date: ann, years } : null;
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  variant, message, onDismiss,
}: { variant: "amber" | "red"; message: string; onDismiss: () => void }) {
  const styles = variant === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-red-200 bg-red-50 text-red-800";
  const Icon = variant === "amber" ? AlertTriangle : FileWarning;
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-medium ${styles}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="hover:opacity-60 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Quick Status Change Dialog ───────────────────────────────────────────────

function QuickStatusDialog({
  emp, onClose, onDone,
}: { emp: Employee | null; onClose: () => void; onDone: () => void }) {
  const [status, setStatus]   = useState(emp?.status ?? "ACTIVE");
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => { if (emp) { setStatus(emp.status); setReason(""); } }, [emp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emp) return;
    setSaving(true);
    try {
      await api.patch(`/employees/${emp.uuid}/status`, { status, reason: reason || null });
      toast.success("Status updated");
      onDone();
      onClose();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!emp} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="p-1 space-y-4">
          <h3 className="text-sm font-semibold">Change Status</h3>
          {emp && <p className="text-xs text-muted-foreground">{emp.user.name}</p>}
          <div className="space-y-1.5">
            <Label className="text-xs">New Status</Label>
            <Select value={status} onValueChange={v => setStatus(v ?? "ACTIVE")}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUICK_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea className="text-sm resize-none" rows={2} placeholder="Reason for change"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="h-9 text-sm">
              {saving ? "Saving…" : "Confirm"}
            </Button>
            <Button type="button" variant="outline" className="h-9 text-sm" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upcoming Events Section ───────────────────────────────────────────────────

function UpcomingEvents({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);

  const events: Array<{ type: "birthday" | "anniversary" | "contract"; emp: Employee; date: Date; extra?: string }> = [];

  for (const emp of employees) {
    const bday = getUpcomingBirthday((emp as Employee & { dateOfBirth?: string | null }).dateOfBirth);
    if (bday) events.push({ type: "birthday", emp, date: bday });

    const ann  = getUpcomingAnniversary(emp.joiningDate);
    if (ann)  events.push({ type: "anniversary", emp, date: ann.date, extra: `${ann.years} year${ann.years > 1 ? "s" : ""}` });

    const contractEnd = (emp as Employee & { contractEndDate?: string | null }).contractEndDate;
    if (contractEnd) {
      const exp = new Date(contractEnd);
      const days = Math.round((exp.getTime() - Date.now()) / 86400000);
      if (days >= 0 && days <= 30) events.push({ type: "contract", emp, date: exp, extra: `${days}d left` });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (events.length === 0) return null;

  const icons = { birthday: "🎂", anniversary: "🎉", contract: "⚠️" };
  const labels: Record<string, (ev: typeof events[0]) => string> = {
    birthday:    ev => `${ev.emp.user.name}'s birthday`,
    anniversary: ev => `${ev.emp.user.name} completes ${ev.extra}`,
    contract:    ev => `${ev.emp.user.name}'s contract — ${ev.extra}`,
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button type="button"
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs font-semibold text-foreground flex-1 text-left">
          Upcoming Events <span className="text-muted-foreground font-normal">({events.length})</span>
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <span className="text-base shrink-0">{icons[ev.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{labels[ev.type](ev)}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {ev.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(employees: Employee[]) {
  const header = ["Employee Code", "Name", "Email", "Department", "Designation", "Employee Type", "Status", "Joining Date"];
  const rows = employees.map(e => [
    e.employeeCode,
    e.user.name,
    e.user.email,
    e.department ?? "",
    e.designation ?? "",
    (e as Employee & { employeeType?: string }).employeeType ?? "",
    e.status,
    fmtDate(e.joiningDate),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "employees.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ─── Main content ─────────────────────────────────────────────────────────────

function EmployeesContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { user }     = useAuthStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState<EmpStats | null>(null);
  const [addOpen, setAddOpen]     = useState(false);
  const [quickEmp, setQuickEmp]   = useState<Employee | null>(null);

  // Dismissed banners (session)
  const [bannerDocs, setBannerDocs] = useState(() => sessionStorage.getItem("emp_banner_docs") !== "1");

  // Filters — read from URL on mount
  const [search, setSearch]           = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL");
  const [deptFilter, setDeptFilter]   = useState(searchParams.get("dept")   ?? "ALL");
  const [typeFilter, setTypeFilter]   = useState(searchParams.get("type")   ?? "ALL");
  const [modeFilter, setModeFilter]   = useState(searchParams.get("mode")   ?? "ALL");

  const canCreate = CAN_CREATE.includes(user?.role ?? "");
  const isAdmin   = ADMIN_ROLES.includes(user?.role ?? "");

  // Sync filters to URL
  function pushUrl(updates: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === "ALL" || v === "") p.delete(k); else p.set(k, v);
    }
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)                      params["search"]       = search;
      if (statusFilter !== "ALL")      params["status"]       = statusFilter;
      if (deptFilter !== "ALL")        params["department"]   = deptFilter;
      if (typeFilter !== "ALL")        params["employeeType"] = typeFilter;
      if (modeFilter !== "ALL")        params["workMode"]     = modeFilter;
      const res = await api.get<ApiResponse<Employee[]>>("/employees", { params });
      setEmployees(res.data.data);
    } catch { setEmployees([]); }
    finally  { setLoading(false); }
  }, [search, statusFilter, deptFilter, typeFilter, modeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchEmployees, search]);

  // Fetch stats once
  useEffect(() => {
    api.get<ApiResponse<EmpStats>>("/employees/stats")
      .then(r => setStats(r.data.data))
      .catch(() => {});
  }, []);

  function clearFilters() {
    setSearch(""); setStatusFilter("ALL"); setDeptFilter("ALL");
    setTypeFilter("ALL"); setModeFilter("ALL");
    router.replace(pathname, { scroll: false });
  }

  const anyFilter = search || statusFilter !== "ALL" || deptFilter !== "ALL" || typeFilter !== "ALL" || modeFilter !== "ALL";
  const allDepts  = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  return (
    <div className="space-y-4 print:space-y-2">

      {/* ── Banners ─────────────────────────────────────────────────────────── */}
      {bannerDocs && stats && stats.missingMandatoryDocs > 0 && (
        <AlertBanner
          variant="red"
          message={`📄 ${stats.missingMandatoryDocs} employee${stats.missingMandatoryDocs > 1 ? "s have" : " has"} missing mandatory documents`}
          onDismiss={() => { setBannerDocs(false); sessionStorage.setItem("emp_banner_docs", "1"); }}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">Employees</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => exportCsv(employees)}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => window.print()}>
            <Printer className="w-3 h-3" /> Print
          </Button>
          {canCreate && (
            <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
              + Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
          {[
            { label: "Total",         value: stats.total,                color: "" },
            { label: "Active",        value: stats.active,               color: "text-emerald-600" },
            { label: "On Probation",  value: stats.onProbation,          color: "text-blue-600" },
            { label: "Notice Period", value: stats.onNoticePeriod,       color: "text-amber-600" },
            { label: "Missing Docs",  value: stats.missingMandatoryDocs, color: "text-red-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color || "text-foreground"}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <Input
          placeholder="Search name, code, email…"
          value={search}
          onChange={e => { setSearch(e.target.value); pushUrl({ search: e.target.value, status: statusFilter, dept: deptFilter, type: typeFilter, mode: modeFilter }); }}
          className="h-8 max-w-56 text-xs"
        />
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v ?? "ALL"); pushUrl({ search, status: v ?? "ALL", dept: deptFilter, type: typeFilter, mode: modeFilter }); }}>
          <SelectTrigger className="h-8 w-44 text-xs"><span className="text-muted-foreground mr-1 shrink-0">Status:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL"           className="text-xs">All</SelectItem>
            <SelectItem value="ACTIVE"        className="text-xs">Active</SelectItem>
            <SelectItem value="PROBATION"     className="text-xs">Probation</SelectItem>
            <SelectItem value="NOTICE_PERIOD" className="text-xs">Notice Period</SelectItem>
            <SelectItem value="RESIGNED"      className="text-xs">Resigned</SelectItem>
            <SelectItem value="TERMINATED"    className="text-xs">Terminated</SelectItem>
            <SelectItem value="INACTIVE"      className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={v => { setDeptFilter(v ?? "ALL"); pushUrl({ search, status: statusFilter, dept: v ?? "ALL", type: typeFilter, mode: modeFilter }); }}>
          <SelectTrigger className="h-8 w-44 text-xs"><span className="text-muted-foreground mr-1 shrink-0">Dept:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All</SelectItem>
            {allDepts.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v ?? "ALL"); pushUrl({ search, status: statusFilter, dept: deptFilter, type: v ?? "ALL", mode: modeFilter }); }}>
          <SelectTrigger className="h-8 w-40 text-xs"><span className="text-muted-foreground mr-1 shrink-0">Type:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL"        className="text-xs">All</SelectItem>
            <SelectItem value="full_time"  className="text-xs">Full-time</SelectItem>
            <SelectItem value="contract"   className="text-xs">Contract</SelectItem>
            <SelectItem value="internship" className="text-xs">Internship</SelectItem>
            <SelectItem value="freelance"  className="text-xs">Freelance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={v => { setModeFilter(v ?? "ALL"); pushUrl({ search, status: statusFilter, dept: deptFilter, type: typeFilter, mode: v ?? "ALL" }); }}>
          <SelectTrigger className="h-8 w-40 text-xs"><span className="text-muted-foreground mr-1 shrink-0">Mode:</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL"    className="text-xs">All</SelectItem>
            <SelectItem value="office" className="text-xs">Office</SelectItem>
            <SelectItem value="remote" className="text-xs">Remote</SelectItem>
            <SelectItem value="hybrid" className="text-xs">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        {anyFilter && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={clearFilters}>
            <X className="w-3 h-3" /> Clear All
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{loading ? "…" : `${employees.length} employee${employees.length !== 1 ? "s" : ""}`}</span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Employee", "Code", "Designation / Dept.", "Type", "Work Mode", "Status", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No employees found.</td></tr>
              ) : (
                employees.map(emp => {
                  const e = emp as Employee & { employeeType?: string | null; workMode?: string | null };
                  return (
                    <tr key={emp.uuid} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.user.name} url={emp.user.avatarUrl} />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[140px]">{emp.user.name}</p>
                            {emp.personalEmail ? (
                              <a href={`mailto:${emp.personalEmail}`}
                                className="text-[10px] text-muted-foreground hover:text-primary hover:underline truncate max-w-[140px] block transition-colors"
                              >{emp.personalEmail}</a>
                            ) : (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">—</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{emp.employeeCode}</span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-foreground truncate max-w-[130px]">{emp.designation ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{emp.department ?? ""}</p>
                      </td>
                      <td className="px-3 py-3"><TypeBadge type={e.employeeType} /></td>
                      <td className="px-3 py-3"><WorkModeBadge mode={e.workMode} /></td>
                      <td className="px-3 py-3"><EmpStatusBadge status={emp.status} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-start">
                          {emp.whatsappNumber && (
                            <a
                              href={`https://wa.me/${emp.whatsappNumber.replace(/[^0-9]/g, "")}`}
                              target="_blank" rel="noopener noreferrer"
                              title="WhatsApp"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <a
                            href={`mailto:${emp.user.email}`}
                            title={emp.user.email}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <Link href={`/employees/${emp.uuid}`}
                            title="View"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {isAdmin && (
                            <button type="button"
                              title="Edit Status"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                              onClick={() => setQuickEmp(emp)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Upcoming Events ──────────────────────────────────────────────────── */}
      {!loading && employees.length > 0 && (
        <div className="print:hidden">
          <UpcomingEvents employees={employees} />
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <AddEmployeeWizard open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchEmployees} />
      <QuickStatusDialog emp={quickEmp} onClose={() => setQuickEmp(null)} onDone={fetchEmployees} />
    </div>
  );
}

// ─── Page export (Suspense required for useSearchParams) ──────────────────────

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesContent />
    </Suspense>
  );
}
