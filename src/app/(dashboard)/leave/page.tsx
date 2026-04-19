"use client";

// src/app/(dashboard)/leave/page.tsx
// EMPLOYEE: balance cards + apply modal + my history
// HR/ADMIN: pending approvals + all requests + calendar

import { useEffect, useState, useCallback } from "react";
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
import type { LeaveRequest, LeaveBalance, ApiResponse } from "@/types";

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

const LEAVE_TYPES = ["CASUAL","SICK","PAID","EMERGENCY","COMP_OFF"];
const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
  CANCELLED:"bg-slate-100 text-slate-500 border-slate-200",
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Count working days (Mon–Sat) between two date strings
function countWorkingDays(from: string, to: string): number {
  if (!from || !to) return 0;
  let count = 0;
  const cur = new Date(from); cur.setHours(0,0,0,0);
  const end = new Date(to);   end.setHours(0,0,0,0);
  while (cur <= end) { if (cur.getDay() !== 0) count++; cur.setDate(cur.getDate() + 1); }
  return count;
}

// ── Leave Balance Bar ─────────────────────────────────────────────────────
function BalanceCard({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <span className={`text-xs font-bold ${color}`}>{remaining} left</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1">
        <div className={`h-full rounded-full ${color.replace("text-","bg-").replace("-600","-400")}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400">{used} used of {total}</p>
    </div>
  );
}

// ── Apply Leave Modal ─────────────────────────────────────────────────────
function ApplyLeaveModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied: () => void }) {
  const [form, setForm] = useState({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  const days = form.fromDate && form.toDate ? countWorkingDays(form.fromDate, form.toDate) : 0;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.fromDate || !form.toDate) { setError("From and To dates are required"); return; }
    if (days === 0) { setError("No working days in selected range"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/leave", { ...form, reason: form.reason || null });
      onApplied(); onClose();
      setForm({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "" });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">Apply for Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Leave Type</Label>
            <Select value={form.leaveType} onValueChange={(v) => set("leaveType", v ?? "CASUAL")}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">{t.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">From Date</Label>
              <Input type="date" value={form.fromDate} onChange={(e) => set("fromDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">To Date</Label>
              <Input type="date" value={form.toDate} onChange={(e) => set("toDate", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-2 font-medium">
              {days} working day{days !== 1 ? "s" : ""} requested
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Reason (optional)</Label>
            <textarea
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave Calendar (HR) ───────────────────────────────────────────────────
function LeaveCalendar({ requests, month, year }: { requests: LeaveRequest[]; month: number; year: number }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();

  // Map day → list of who's on leave
  const dayMap: Record<number, LeaveRequest[]> = {};
  requests.forEach((req) => {
    const from = new Date(req.fromDate);
    const to   = new Date(req.toDate);
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = new Date(year, month - 1, d);
      if (dd >= from && dd <= to && dd.getDay() !== 0) {
        if (!dayMap[d]) dayMap[d] = [];
        dayMap[d].push(req);
      }
    }
  });

  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const EMP_COLORS = ["bg-blue-200","bg-green-200","bg-purple-200","bg-orange-200","bg-pink-200","bg-yellow-200","bg-teal-200"];
  const empColorMap: Record<number, string> = {};
  let colorIdx = 0;
  requests.forEach((r) => {
    if (!(r.employeeId in empColorMap)) {
      empColorMap[r.employeeId] = EMP_COLORS[colorIdx % EMP_COLORS.length];
      colorIdx++;
    }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Leave Calendar — {new Date(year, month-1).toLocaleString("en-IN",{month:"long"})} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>)}
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dow = new Date(year, month - 1, day).getDay();
          const onLeave = dayMap[day] ?? [];
          return (
            <div
              key={day}
              className={`rounded border min-h-10 p-1 text-xs ${dow === 0 ? "bg-slate-50 border-slate-100" : "border-slate-200 bg-white"}`}
            >
              <p className={`font-medium mb-0.5 ${dow === 0 ? "text-slate-300" : "text-slate-600"}`}>{day}</p>
              {onLeave.slice(0,2).map((r) => (
                <div key={r.id} className={`text-[10px] rounded px-1 py-px truncate ${empColorMap[r.employeeId] ?? "bg-blue-200"}`} title={r.employee?.user.name}>
                  {r.employee?.user.name?.split(" ")[0]}
                </div>
              ))}
              {onLeave.length > 2 && <div className="text-[10px] text-slate-400">+{onLeave.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function LeavePage() {
  const { user } = useAuthStore();
  const isHR     = HR_ROLES.includes(user?.role ?? "");
  const now      = new Date();

  const [tab, setTab]               = useState<"pending" | "all" | "calendar">("pending");
  const [applyOpen, setApplyOpen]   = useState(false);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [myBalance, setMyBalance]   = useState<LeaveBalance | null>(null);
  const [pending, setPending]       = useState<LeaveRequest[]>([]);
  const [allReqs, setAllReqs]       = useState<LeaveRequest[]>([]);
  const [calReqs, setCalReqs]       = useState<LeaveRequest[]>([]);
  const [calMonth, setCalMonth]     = useState(now.getMonth() + 1);
  const [calYear, setCalYear]       = useState(now.getFullYear());
  const [reviewing, setReviewing]   = useState<string | null>(null);

  const fetchMy = useCallback(async () => {
    try {
      const reqRes = await api.get<ApiResponse<LeaveRequest[]>>("/leave/my-requests");
      setMyRequests(reqRes.data.data);
      try {
        const balRes = await api.get<ApiResponse<LeaveBalance>>(`/employees/${user?.uuid ?? ""}/leave-balance`);
        setMyBalance(balRes.data.data ?? null);
      } catch { setMyBalance(null); }
    } catch { /* ignore */ }
  }, [user?.uuid]);

  const fetchHR = useCallback(async () => {
    try {
      const [pendRes, allRes] = await Promise.all([
        api.get<ApiResponse<LeaveRequest[]>>("/leave/pending"),
        api.get<ApiResponse<LeaveRequest[]>>("/leave/all"),
      ]);
      setPending(pendRes.data.data);
      setAllReqs(allRes.data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<LeaveRequest[]>>("/leave/calendar", {
        params: { month: String(calMonth), year: String(calYear) },
      });
      setCalReqs(res.data.data);
    } catch { /* ignore */ }
  }, [calMonth, calYear]);

  useEffect(() => {
    if (isHR) { fetchHR(); fetchCalendar(); }
    else fetchMy();
  }, [isHR, fetchMy, fetchHR, fetchCalendar]);

  useEffect(() => { if (isHR && tab === "calendar") fetchCalendar(); }, [isHR, tab, fetchCalendar]);

  async function handleReview(uuid: string, status: "APPROVED" | "REJECTED") {
    setReviewing(uuid);
    try {
      await api.patch(`/leave/${uuid}/review`, { status });
      fetchHR();
    } finally { setReviewing(null); }
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en-IN",{month:"long"}) }));

  // ── EMPLOYEE VIEW ─────────────────────────────────────────────────────
  if (!isHR) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Leave</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your leave balance and history</p>
          </div>
          <Button onClick={() => setApplyOpen(true)} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
            + Apply for Leave
          </Button>
        </div>

        {/* Balance Cards */}
        {myBalance && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BalanceCard label="Casual Leave"  used={Number(myBalance.casualUsed)} total={Number(myBalance.casualTotal)} color="text-blue-600" />
            <BalanceCard label="Sick Leave"    used={Number(myBalance.sickUsed)}   total={Number(myBalance.sickTotal)}   color="text-amber-600" />
            <BalanceCard label="Paid Leave"    used={Number(myBalance.paidUsed)}   total={Number(myBalance.paidTotal)}   color="text-emerald-600" />
            <BalanceCard label="Comp-Off"      used={0}                            total={Number(myBalance.compOff)}     color="text-indigo-600" />
          </div>
        )}

        {/* My History Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">My Leave History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No leave requests yet.</td></tr>
                ) : myRequests.map((r) => (
                  <tr key={r.uuid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.leaveType.replace("_"," ")}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(r.fromDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(r.toDate)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{Number(r.days)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 italic">{r.reviewNote ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} onApplied={fetchMy} />
      </div>
    );
  }

  // ── HR VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Leave Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and manage leave requests</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {([["pending","Pending",pending.length],["all","All Requests",null],["calendar","Calendar",null]] as const).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                tab === id ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-semibold w-5 h-5">{count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Pending tab ───────────────────────────────────────────── */}
      {tab === "pending" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No pending requests.</td></tr>
                ) : pending.map((r) => {
                  const lb  = r.employee?.leaveBalances?.[0];
                  const typeKey = (r.leaveType === "EMERGENCY" ? "CASUAL" : r.leaveType).toLowerCase();
                  const lbAny = lb as unknown as Record<string, number> | undefined;
                  const used  = lbAny ? Number(lbAny[`${typeKey}Used`]  ?? 0) : 0;
                  const total = lbAny ? Number(lbAny[`${typeKey}Total`] ?? 0) : 0;
                  return (
                    <tr key={r.uuid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.employee?.user.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.employee?.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{r.leaveType.replace("_"," ")}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{Number(r.days)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{r.reason ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {lb ? `${Math.max(0, total - used)}/${total} left` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={reviewing === r.uuid}
                            onClick={() => handleReview(r.uuid, "APPROVED")}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewing === r.uuid}
                            onClick={() => handleReview(r.uuid, "REJECTED")}
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── All Requests tab ─────────────────────────────────────── */}
      {tab === "all" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied</th>
                </tr>
              </thead>
              <tbody>
                {allReqs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No leave requests found.</td></tr>
                ) : allReqs.map((r) => (
                  <tr key={r.uuid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.employee?.user.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.leaveType.replace("_"," ")}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(r.fromDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(r.toDate)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{Number(r.days)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Calendar tab ──────────────────────────────────────────── */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={String(calMonth)} onValueChange={(v) => setCalMonth(Number(v))}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-sm">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(calYear)} onValueChange={(v) => setCalYear(Number(v))}>
              <SelectTrigger className="h-9 w-28 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[now.getFullYear()-1, now.getFullYear()].map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LeaveCalendar requests={calReqs} month={calMonth} year={calYear} />
        </div>
      )}
    </div>
  );
}
