"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";
import type { LeaveRequest, LeaveBalance, CompOffRequest, Employee, ApiResponse } from "@/types";

function FilterSelect({
  label, value, options, onChange, width = "w-40", placeholder = "All",
}: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  width?: string; placeholder?: string;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <Select value={value} onValueChange={v => onChange(v ?? "")}>
      <SelectTrigger className={`h-9 text-sm ${width}`}>
        <span className="flex items-center gap-1 truncate min-w-0">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];
const LEAVE_TYPES = ["CASUAL","SICK","PAID","EMERGENCY","COMP_OFF"];
const HALF_DAY_LEAVE_TYPES = ["CASUAL","SICK","PAID"];
const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-600 border-amber-500/25",
  APPROVED:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  REJECTED:  "bg-red-500/10 text-red-500 border-red-500/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function countWorkingDays(from: string, to: string): number {
  if (!from || !to) return 0;
  let count = 0;
  const cur = new Date(from); cur.setHours(0,0,0,0);
  const end = new Date(to);   end.setHours(0,0,0,0);
  while (cur <= end) { if (cur.getDay() !== 0) count++; cur.setDate(cur.getDate() + 1); }
  return count;
}

function HalfDayBadge({ slot }: { slot?: string | null }) {
  if (!slot) return null;
  const label = slot === "FIRST_HALF" ? "AM" : "PM";
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-1.5 py-px text-[10px] font-semibold text-violet-600">
      ½ {label}
    </span>
  );
}

function BalanceCard({ label, used, total, color, index = 0 }: { label: string; used: number; total: number; color: string; index?: number }) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className={`text-xs font-bold ${color}`}>{remaining % 1 === 0 ? remaining : remaining.toFixed(1)} left</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "currentColor" }} />
      </div>
      <p className="text-xs text-muted-foreground">{used % 1 === 0 ? used : used.toFixed(1)} used of {total % 1 === 0 ? total : total.toFixed(1)}</p>
    </div>
  );
}

// ── Apply Leave Modal ─────────────────────────────────────────────────────────
function ApplyLeaveModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied: () => void }) {
  const [form, setForm] = useState({
    leaveType: "CASUAL", fromDate: "", toDate: "", reason: "",
    isHalfDay: false, halfDaySlot: "FIRST_HALF",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function set(f: string, v: string | boolean) { setForm((p) => ({ ...p, [f]: v })); }

  function handleHalfDayToggle(on: boolean) {
    setForm(p => ({
      ...p, isHalfDay: on,
      leaveType: on && !HALF_DAY_LEAVE_TYPES.includes(p.leaveType) ? "CASUAL" : p.leaveType,
      toDate: on ? p.fromDate : p.toDate,
    }));
  }

  function handleFromDate(v: string) {
    setForm(p => ({ ...p, fromDate: v, toDate: p.isHalfDay ? v : p.toDate }));
  }

  const days = form.isHalfDay ? 0.5 : (form.fromDate && form.toDate ? countWorkingDays(form.fromDate, form.toDate) : 0);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.fromDate || !form.toDate) { setError("From and To dates are required"); return; }
    if (!form.isHalfDay && days === 0) { setError("No working days in selected range"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/leave", {
        leaveType: form.leaveType,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason || null,
        isHalfDay: form.isHalfDay,
        halfDaySlot: form.isHalfDay ? form.halfDaySlot : undefined,
      });
      onApplied(); onClose();
      setForm({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "", isHalfDay: false, halfDaySlot: "FIRST_HALF" });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Apply for Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          {/* Half-day toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Half Day</p>
              <p className="text-[11px] text-muted-foreground">Single day, 0.5 days deducted</p>
            </div>
            <button
              type="button"
              onClick={() => handleHalfDayToggle(!form.isHalfDay)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.isHalfDay ? "bg-primary" : "bg-muted-foreground/30"}`}
              aria-checked={form.isHalfDay}
              role="switch"
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.isHalfDay ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Leave type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Leave Type</Label>
            <Select
              value={form.leaveType}
              onValueChange={(v) => set("leaveType", v ?? "CASUAL")}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(form.isHalfDay ? HALF_DAY_LEAVE_TYPES : LEAVE_TYPES).map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">{t.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className={`grid gap-3 ${form.isHalfDay ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{form.isHalfDay ? "Date" : "From Date"}</Label>
              <Input type="date" value={form.fromDate} onChange={(e) => handleFromDate(e.target.value)} className="h-9 text-sm" />
            </div>
            {!form.isHalfDay && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">To Date</Label>
                <Input type="date" value={form.toDate} onChange={(e) => set("toDate", e.target.value)} className="h-9 text-sm" />
              </div>
            )}
          </div>

          {/* Half-day slot selector */}
          {form.isHalfDay && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Slot</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["FIRST_HALF","SECOND_HALF"] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => set("halfDaySlot", slot)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      form.halfDaySlot === slot
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {slot === "FIRST_HALF" ? "First Half (AM)" : "Second Half (PM)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {days > 0 && (
            <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 font-medium">
              {days} working day{days !== 1 ? "s" : ""} requested
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Reason (optional)</Label>
            <textarea
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground">
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Request Comp-Off Modal ────────────────────────────────────────────────────
function RequestCompOffModal({ open, onClose, onSubmitted }: { open: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm]   = useState({ workedDate: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.workedDate) { setError("Worked date is required"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/comp-off/request", { workedDate: form.workedDate, reason: form.reason || null });
      onSubmitted(); onClose();
      setForm({ workedDate: "", reason: "" });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Request Comp Off</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground">Submit a request for comp-off earned by working on a weekend. HR will review and credit 1 day to your balance (valid for 90 days).</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Date Worked (must be Saturday or Sunday)</Label>
            <Input type="date" value={form.workedDate} onChange={(e) => setForm(p => ({ ...p, workedDate: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Reason / Work Done</Label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-9 text-sm">
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave Calendar ────────────────────────────────────────────────────────────
function LeaveCalendar({ requests, month, year }: { requests: LeaveRequest[]; month: number; year: number }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();

  // Parse "YYYY-MM-DD" as local midnight to avoid UTC-vs-local offset bugs
  function parseLocalDate(s: string): Date {
    const [y, m, d] = s.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const dayMap: Record<number, LeaveRequest[]> = {};
  requests.forEach((req) => {
    const from = parseLocalDate(req.fromDate);
    const to   = parseLocalDate(req.toDate);
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = new Date(year, month - 1, d);
      if (dd >= from && dd <= to && dd.getDay() !== 0) {
        if (!dayMap[d]) dayMap[d] = [];
        dayMap[d].push(req);
      }
    }
  });

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  // Violet/purple reserved for Comp Off — excluded from per-employee palette
  const EMP_COLORS = ["bg-blue-500/20","bg-emerald-500/20","bg-orange-500/20","bg-pink-500/20","bg-amber-500/20","bg-teal-500/20","bg-sky-500/20"];
  const empColorMap: Record<number, string> = {};
  let colorIdx = 0;
  requests.forEach((r) => {
    if (r.leaveType !== "COMP_OFF" && !(r.employeeId in empColorMap)) {
      empColorMap[r.employeeId] = EMP_COLORS[colorIdx % EMP_COLORS.length];
      colorIdx++;
    }
  });

  function getCellColor(r: LeaveRequest): string {
    if (r.leaveType === "COMP_OFF") return "bg-purple-500/20 ring-1 ring-purple-400/40";
    return empColorMap[r.employeeId] ?? "bg-blue-500/20";
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Leave Calendar — {new Date(year, month-1).toLocaleString("en-IN",{month:"long"})} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dow = new Date(year, month - 1, day).getDay();
          const onLeave = dayMap[day] ?? [];
          return (
            <div key={day} className={`rounded-lg border min-h-10 p-1 text-xs ${dow === 0 ? "bg-muted/30 border-border/50" : "border-border bg-card"}`}>
              <p className={`font-medium mb-0.5 ${dow === 0 ? "text-muted-foreground/40" : "text-foreground"}`}>{day}</p>
              {onLeave.slice(0,2).map((r) => (
                <div key={r.id} className={`text-[10px] rounded px-1 py-px truncate ${getCellColor(r)} text-foreground`} title={`${r.employee?.user.name ?? ""}${r.leaveType === "COMP_OFF" ? " (Comp Off)" : ""}`}>
                  {r.employee?.user.name?.split(" ")[0]}{r.isHalfDay ? " ½" : ""}
                </div>
              ))}
              {onLeave.length > 2 && <div className="text-[10px] text-muted-foreground">+{onLeave.length - 2}</div>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500/20" />
          <span className="text-[11px] text-muted-foreground">Regular Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-500/20 ring-1 ring-purple-400/40" />
          <span className="text-[11px] text-muted-foreground">Comp Off</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeavePage() {
  const { user } = useAuthStore();
  const isHR     = HR_ROLES.includes(user?.role ?? "");
  const now      = new Date();

  const [tab, setTab]               = useState<"pending" | "all" | "calendar" | "compoff">("pending");
  const [applyOpen, setApplyOpen]   = useState(false);
  const [compOffOpen, setCompOffOpen] = useState(false);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [myBalance, setMyBalance]   = useState<LeaveBalance | null>(null);
  const [myCompOff, setMyCompOff]   = useState<CompOffRequest[]>([]);
  const [pending, setPending]       = useState<LeaveRequest[]>([]);
  const [allReqs, setAllReqs]       = useState<LeaveRequest[]>([]);
  const [calReqs, setCalReqs]       = useState<LeaveRequest[]>([]);
  const [pendingCompOff, setPendingCompOff] = useState<CompOffRequest[]>([]);
  const [allCompOff, setAllCompOff]         = useState<CompOffRequest[]>([]);
  const [calMonth, setCalMonth]     = useState(now.getMonth() + 1);
  const [calYear, setCalYear]       = useState(now.getFullYear());
  const [reviewing, setReviewing]   = useState<string | null>(null);
  const [reviewingCompOff, setReviewingCompOff] = useState<string | null>(null);

  // Employee list for filter dropdowns
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);

  // All Requests tab filters
  const [allStatus, setAllStatus]       = useState("");
  const [allLeaveType, setAllLeaveType] = useState("");
  const [allEmployee, setAllEmployee]   = useState("");
  const [allYear, setAllYear]           = useState("");
  const [allMonth, setAllMonth]         = useState("");
  const [allDate, setAllDate]           = useState("");

  // Comp Off tab filters
  const [coStatus, setCoStatus]     = useState("");
  const [coEmployee, setCoEmployee] = useState("");
  const [coYear, setCoYear]         = useState("");
  const [coMonth, setCoMonth]       = useState("");
  const [coDate, setCoDate]         = useState("");

  // Bulk select (pending tab only)
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoad]            = useState(false);
  const pendingHeaderRef = useRef<HTMLInputElement>(null);

  const allPendingSelected  = pending.length > 0 && selectedPending.size === pending.length;
  const somePendingSelected = selectedPending.size > 0 && selectedPending.size < pending.length;

  useEffect(() => {
    if (pendingHeaderRef.current) pendingHeaderRef.current.indeterminate = somePendingSelected;
  }, [somePendingSelected]);

  useEffect(() => { setSelectedPending(new Set()); }, [tab]);

  function toggleOnePending(uuid: string) {
    setSelectedPending(prev => { const n = new Set(prev); n.has(uuid) ? n.delete(uuid) : n.add(uuid); return n; });
  }
  function toggleAllPending() {
    setSelectedPending(allPendingSelected ? new Set() : new Set(pending.map(r => r.uuid)));
  }

  // Data fetching
  const fetchMy = useCallback(async () => {
    try {
      const [reqRes, compOffRes] = await Promise.all([
        api.get<ApiResponse<LeaveRequest[]>>("/leave/my-requests"),
        api.get<ApiResponse<CompOffRequest[]>>("/comp-off/my-requests"),
      ]);
      setMyRequests(reqRes.data.data);
      setMyCompOff(compOffRes.data.data);
      try {
        const balRes = await api.get<ApiResponse<LeaveBalance>>(`/employees/${user?.uuid ?? ""}/leave-balance`);
        setMyBalance(balRes.data.data ?? null);
      } catch { setMyBalance(null); }
    } catch { /* ignore */ }
  }, [user?.uuid]);

  const fetchPending = useCallback(async () => {
    try {
      const [pendRes, pendCoRes] = await Promise.all([
        api.get<ApiResponse<LeaveRequest[]>>("/leave/pending"),
        api.get<ApiResponse<CompOffRequest[]>>("/comp-off/pending"),
      ]);
      setPending(pendRes.data.data);
      setPendingCompOff(pendCoRes.data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchAllReqs = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (allStatus)    params["status"]     = allStatus;
      if (allLeaveType) params["leaveType"]  = allLeaveType;
      if (allEmployee)  params["employeeId"] = allEmployee;
      if (allYear)      params["year"]       = allYear;
      if (allMonth)     params["month"]      = allMonth;
      if (allDate)      params["date"]       = allDate;
      const res = await api.get<ApiResponse<LeaveRequest[]>>("/leave/all", { params });
      setAllReqs(res.data.data);
    } catch { /* ignore */ }
  }, [allStatus, allLeaveType, allEmployee, allYear, allMonth, allDate]);

  const fetchAllCompOff = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (coStatus)   params["status"]     = coStatus;
      if (coEmployee) params["employeeId"] = coEmployee;
      if (coYear)     params["year"]       = coYear;
      if (coMonth)    params["month"]      = coMonth;
      if (coDate)     params["date"]       = coDate;
      const res = await api.get<ApiResponse<CompOffRequest[]>>("/comp-off/all", { params });
      setAllCompOff(res.data.data);
    } catch { /* ignore */ }
  }, [coStatus, coEmployee, coYear, coMonth, coDate]);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<LeaveRequest[]>>("/leave/calendar", {
        params: { month: String(calMonth), year: String(calYear) },
      });
      setCalReqs(res.data.data);
    } catch { /* ignore */ }
  }, [calMonth, calYear]);

  useEffect(() => {
    if (isHR) {
      fetchPending();
      fetchAllReqs();
      fetchAllCompOff();
      fetchCalendar();
      api.get<ApiResponse<Employee[]>>("/employees")
        .then(res => {
          setEmployees(res.data.data.map(e => ({ value: String(e.id), label: e.user.name })));
        })
        .catch(() => {});
    } else fetchMy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHR]);

  useEffect(() => { if (isHR) fetchAllReqs(); }, [isHR, fetchAllReqs]);
  useEffect(() => { if (isHR) fetchAllCompOff(); }, [isHR, fetchAllCompOff]);
  useEffect(() => { if (isHR && tab === "calendar") fetchCalendar(); }, [isHR, tab, fetchCalendar]);

  async function handleReview(uuid: string, status: "APPROVED" | "REJECTED") {
    setReviewing(uuid);
    try { await api.patch(`/leave/${uuid}/review`, { status }); fetchPending(); fetchAllReqs(); }
    finally { setReviewing(null); }
  }

  async function handleReviewCompOff(uuid: string, status: "APPROVED" | "REJECTED") {
    setReviewingCompOff(uuid);
    try { await api.patch(`/comp-off/${uuid}/review`, { status }); fetchPending(); fetchAllCompOff(); }
    finally { setReviewingCompOff(null); }
  }

  async function bulkReview(status: "APPROVED" | "REJECTED") {
    const uuids = Array.from(selectedPending);
    const label = status === "APPROVED" ? "Approve" : "Reject";
    if (!confirm(`${label} ${uuids.length} leave request${uuids.length !== 1 ? "s" : ""}?`)) return;
    setBulkLoad(true);
    const results = await Promise.allSettled(uuids.map(uuid => api.patch(`/leave/${uuid}/review`, { status })));
    const failed  = results.filter(r => r.status === "rejected").length;
    setBulkLoad(false);
    setSelectedPending(new Set());
    if (failed > 0) alert(`${uuids.length - failed} ${status.toLowerCase()}, ${failed} failed`);
    fetchPending(); fetchAllReqs();
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" }),
  }));

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => ({
    value: String(y), label: String(y),
  }));

  const STATUS_OPTS = [
    { value: "PENDING",   label: "Pending" },
    { value: "APPROVED",  label: "Approved" },
    { value: "REJECTED",  label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const LEAVE_TYPE_OPTS = [
    { value: "CASUAL",    label: "Casual" },
    { value: "SICK",      label: "Sick" },
    { value: "PAID",      label: "Paid" },
    { value: "EMERGENCY", label: "Emergency" },
    { value: "COMP_OFF",  label: "Comp Off" },
  ];

  const hasAllFilters = !!(allStatus || allLeaveType || allEmployee || allYear || allMonth || allDate);
  function clearAllFilters() {
    setAllStatus(""); setAllLeaveType(""); setAllEmployee("");
    setAllYear(""); setAllMonth(""); setAllDate("");
  }

  const hasCoFilters = !!(coStatus || coEmployee || coYear || coMonth || coDate);
  function clearCoFilters() {
    setCoStatus(""); setCoEmployee(""); setCoYear(""); setCoMonth(""); setCoDate("");
  }

  // ── Employee view ───────────────────────────────────────────────────────────
  if (!isHR) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2 animate-fade-in">
          <Button variant="outline" onClick={() => setCompOffOpen(true)} className="h-9 text-sm">
            Request Comp Off
          </Button>
          <Button onClick={() => setApplyOpen(true)} className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground">
            + Apply for Leave
          </Button>
        </div>

        {myBalance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BalanceCard index={0} label="Casual Leave"  used={Number(myBalance.casualUsed)} total={Number(myBalance.casualTotal)} color="text-blue-500" />
            <BalanceCard index={1} label="Sick Leave"    used={Number(myBalance.sickUsed)}   total={Number(myBalance.sickTotal)}   color="text-amber-500" />
            <BalanceCard index={2} label="Paid Leave"    used={Number(myBalance.paidUsed)}   total={Number(myBalance.paidTotal)}   color="text-emerald-600" />
            <BalanceCard index={3} label="Comp Off"      used={0}                            total={Number(myBalance.compOff)}     color="text-purple-600" />
          </div>
        )}

        {/* Leave history */}
        <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">My Leave History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No leave requests yet.</td></tr>
                ) : myRequests.map((r) => (
                  <tr key={r.uuid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.leaveType.replace("_"," ")}
                      {r.isHalfDay && <HalfDayBadge slot={r.halfDaySlot} />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.fromDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.isHalfDay ? "—" : fmtDate(r.toDate)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{Number(r.days)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground italic">{r.reviewNote ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comp-off earn history */}
        {myCompOff.length > 0 && (
          <div className="animate-fade-up delay-300 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Comp Off Earn Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Worked Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {myCompOff.map((r) => {
                    const expiring = r.expiresAt && new Date(r.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <tr key={r.uuid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{fmtDate(r.workedDate)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.reason ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.expiresAt ? (
                            <span className={expiring ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                              {fmtDate(r.expiresAt)}{expiring ? " ⚠" : ""}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} onApplied={fetchMy} />
        <RequestCompOffModal open={compOffOpen} onClose={() => setCompOffOpen(false)} onSubmitted={fetchMy} />
      </div>
    );
  }

  // ── HR view ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="border-b border-border animate-fade-in delay-100">
        <nav className="flex gap-0">
          {([
            ["pending",  "Pending",        pending.length],
            ["all",      "All Requests",   null],
            ["compoff",  "Comp Off",        pendingCompOff.length],
            ["calendar", "Calendar",        null],
          ] as const).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500/10 text-red-500 text-xs font-semibold w-5 h-5">{count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Pending leave tab ───────────────────────────────────────────────── */}
      {tab === "pending" && (
        <div className="space-y-3 animate-fade-up">
          {selectedPending.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/5">
              <span className="text-sm font-semibold text-primary">{selectedPending.size} selected</span>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => bulkReview("APPROVED")} disabled={bulkLoading} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                  Approve Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkReview("REJECTED")} disabled={bulkLoading} className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-50 hover:border-red-300">
                  {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                  Reject Selected
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPending(new Set())} className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground">Clear</Button>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="pl-4 pr-2 py-3 w-8">
                      <input ref={pendingHeaderRef} type="checkbox" checked={allPendingSelected} onChange={toggleAllPending}
                        disabled={pending.length === 0} className="h-4 w-4 rounded border-border cursor-pointer accent-primary disabled:cursor-not-allowed" aria-label="Select all pending" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No pending requests.</td></tr>
                  ) : pending.map((r) => {
                    const isSelected = selectedPending.has(r.uuid);
                    const lb      = r.employee?.leaveBalances?.[0];
                    const typeKey = (r.leaveType === "EMERGENCY" ? "CASUAL" : r.leaveType).toLowerCase();
                    const lbAny   = lb as unknown as Record<string, number> | undefined;
                    const used    = r.leaveType === "COMP_OFF" ? 0 : (lbAny ? Number(lbAny[`${typeKey}Used`] ?? 0) : 0);
                    const total   = r.leaveType === "COMP_OFF" ? (lbAny ? Number(lbAny["compOff"] ?? 0) : 0) : (lbAny ? Number(lbAny[`${typeKey}Total`] ?? 0) : 0);
                    return (
                      <tr key={r.uuid} className={`border-b border-border last:border-0 transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/40"}`}>
                        <td className="pl-4 pr-2 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOnePending(r.uuid)}
                            className="h-4 w-4 rounded border-border cursor-pointer accent-primary" aria-label={`Select ${r.employee?.user.name}`} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{r.employee?.user.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.employee?.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">
                          {r.leaveType.replace("_"," ")}
                          {r.isHalfDay && <HalfDayBadge slot={r.halfDaySlot} />}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {fmtDate(r.fromDate)}{!r.isHalfDay ? ` → ${fmtDate(r.toDate)}` : ""}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{Number(r.days)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.reason ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {lb ? `${Math.max(0, total - used)} / ${total} left` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" disabled={reviewing === r.uuid} onClick={() => handleReview(r.uuid, "APPROVED")} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                            <Button size="sm" variant="outline" disabled={reviewing === r.uuid} onClick={() => handleReview(r.uuid, "REJECTED")} className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10">Reject</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── All requests tab ────────────────────────────────────────────────── */}
      {tab === "all" && (
        <div className="space-y-3 animate-fade-up">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label="Status" value={allStatus} options={STATUS_OPTS} onChange={setAllStatus} width="w-40" />
            <FilterSelect label="Type" value={allLeaveType} options={LEAVE_TYPE_OPTS} onChange={setAllLeaveType} width="w-40" />
            <FilterSelect label="Employee" value={allEmployee} options={employees} onChange={setAllEmployee} width="w-44" />
            <FilterSelect label="Year" value={allYear} options={years} onChange={setAllYear} width="w-32" />
            <FilterSelect label="Month" value={allMonth} options={months} onChange={setAllMonth} width="w-40" />
            <Input
              type="date" value={allDate} onChange={e => setAllDate(e.target.value)}
              className="h-9 w-40 text-sm"
              placeholder="Specific date"
            />
            {hasAllFilters && (
              <button onClick={clearAllFilters} className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity">
                <X size={13} />Clear
              </button>
            )}
          </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applied</th>
                </tr>
              </thead>
              <tbody>
                {allReqs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No leave requests found.</td></tr>
                ) : allReqs.map((r) => (
                  <tr key={r.uuid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.employee?.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.leaveType.replace("_"," ")}
                      {r.isHalfDay && <HalfDayBadge slot={r.halfDaySlot} />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.fromDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.isHalfDay ? "—" : fmtDate(r.toDate)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{Number(r.days)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* ── Comp Off requests tab ───────────────────────────────────────────── */}
      {tab === "compoff" && (
        <div className="space-y-4 animate-fade-up">
          {/* Pending earn requests */}
          {pendingCompOff.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-amber-500/5">
                <h3 className="text-sm font-semibold text-foreground">Pending Approval ({pendingCompOff.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Worked Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCompOff.map((r) => (
                      <tr key={r.uuid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{r.employee?.user.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.employee?.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{fmtDate(r.workedDate)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.reason ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" disabled={reviewingCompOff === r.uuid} onClick={() => handleReviewCompOff(r.uuid, "APPROVED")} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                            <Button size="sm" variant="outline" disabled={reviewingCompOff === r.uuid} onClick={() => handleReviewCompOff(r.uuid, "REJECTED")} className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10">Reject</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All comp-off requests history */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground mr-2">All Comp Off Requests</h3>
                <FilterSelect label="Status" value={coStatus} options={STATUS_OPTS} onChange={setCoStatus} width="w-40" />
                <FilterSelect label="Employee" value={coEmployee} options={employees} onChange={setCoEmployee} width="w-44" />
                <FilterSelect label="Year" value={coYear} options={years} onChange={setCoYear} width="w-32" />
                <FilterSelect label="Month" value={coMonth} options={months} onChange={setCoMonth} width="w-40" />
                <Input type="date" value={coDate} onChange={e => setCoDate(e.target.value)} className="h-9 w-40 text-sm" />
                {hasCoFilters && (
                  <button onClick={clearCoFilters} className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity">
                    <X size={13} />Clear
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Worked Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {allCompOff.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No comp-off requests found.</td></tr>
                  ) : allCompOff.map((r) => (
                    <tr key={r.uuid} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.employee?.user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.workedDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.expiresAt ? fmtDate(r.expiresAt) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar tab ────────────────────────────────────────────────────── */}
      {tab === "calendar" && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <FilterSelect
              label="Month" value={String(calMonth)}
              onChange={v => setCalMonth(v === "" ? now.getMonth() + 1 : Number(v))}
              width="w-44" placeholder="This Month"
              options={months}
            />
            <FilterSelect
              label="Year" value={String(calYear)}
              onChange={v => setCalYear(v === "" ? now.getFullYear() : Number(v))}
              width="w-32" placeholder="This Year"
              options={years}
            />
          </div>
          <LeaveCalendar requests={calReqs} month={calMonth} year={calYear} />
        </div>
      )}
    </div>
  );
}
