"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { X, Users, Activity, Download, ClipboardList, Plane } from "lucide-react";
import type { AttendanceLog, AttendanceSummary, Employee, LiveBoardEntry, ApiResponse } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtMins(m: number) {
  if (!m) return "0m";
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("en-IN", { month: "long" });
}

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

const TYPE_COLORS: Record<string, string> = {
  PRESENT:  "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  ABSENT:   "bg-red-500/10 text-red-500 border-red-500/20",
  HALF_DAY: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  LEAVE:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
  HOLIDAY:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
  COMP_OFF: "bg-primary/10 text-primary border-primary/20",
  WFH:      "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  WEEKEND:  "bg-muted/50 text-muted-foreground/30 border-border",
};

const LIVE_STATUS_COLORS: Record<string, string> = {
  IN:       "bg-emerald-500/15 text-emerald-600",
  OUT:      "bg-slate-500/10 text-slate-500",
  NOT_IN:   "bg-red-500/10 text-red-500",
  LEAVE:    "bg-blue-500/10 text-blue-600",
  HOLIDAY:  "bg-violet-500/10 text-violet-600",
  COMP_OFF: "bg-primary/10 text-primary",
};

function FilterSelect({ label, value, options, onChange, width = "w-40", placeholder = "All" }: {
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
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Clock Widget ─────────────────────────────────────────────────────────────

function ClockWidget({ onRefresh }: { onRefresh: () => void }) {
  const [todayLog, setTodayLog] = useState<AttendanceLog | null | undefined>(undefined);
  const [elapsed, setElapsed]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [now, setNow]           = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<AttendanceLog | null>>("/attendance/today");
      setTodayLog(res.data.data);
    } catch { setTodayLog(null); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setNow(new Date());
      if (todayLog?.clockIn && !todayLog.clockOut) {
        const ms = Date.now() - new Date(todayLog.clockIn).getTime();
        const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
        setElapsed(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [todayLog]);

  async function handleClockIn() {
    setLoading(true);
    try { await api.post("/attendance/clock-in"); fetchToday(); onRefresh(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error"); }
    finally { setLoading(false); }
  }
  async function handleClockOut() {
    setLoading(true);
    try { await api.post("/attendance/clock-out"); fetchToday(); onRefresh(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error"); }
    finally { setLoading(false); }
  }

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-bold font-mono text-foreground">{timeStr}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        {todayLog === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !todayLog ? (
          <Button onClick={handleClockIn} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 text-sm font-semibold rounded-xl">
            {loading ? "Clocking in…" : "Clock In"}
          </Button>
        ) : !todayLog.clockOut ? (
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Clocked in at <span className="font-semibold text-foreground">{fmtTime(todayLog.clockIn)}</span></p>
              <p className="text-2xl font-bold font-mono text-primary">{elapsed || "00:00:00"}</p>
              {(todayLog.lateMinutes ?? 0) > 0 && (
                <p className="text-xs text-amber-500 font-medium">Late by {todayLog.lateMinutes}m</p>
              )}
            </div>
            <Button onClick={handleClockOut} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white h-10 px-6 text-sm font-semibold rounded-xl">
              {loading ? "Clocking out…" : "Clock Out"}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-muted-foreground">Clock In</span>   <span className="font-semibold text-foreground">{fmtTime(todayLog.clockIn)}</span>
            <span className="text-muted-foreground">Clock Out</span>  <span className="font-semibold text-foreground">{fmtTime(todayLog.clockOut)}</span>
            <span className="text-muted-foreground">Work Hours</span> <span className="font-semibold text-foreground">{todayLog.workMinutes ? fmtMins(todayLog.workMinutes) : "—"}</span>
            {(todayLog.lateMinutes ?? 0) > 0 && <>
              <span className="text-muted-foreground">Late By</span>
              <span className="font-semibold text-amber-500">{todayLog.lateMinutes}m</span>
            </>}
          </div>
        )}
      </div>

      {/* Quick nav for employees */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Link href="/attendance/regularize" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">
          <ClipboardList size={13} /> Regularize
        </Link>
        <Link href="/attendance/wfh" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">
          <Plane size={13} /> WFH Request
        </Link>
      </div>
    </div>
  );
}

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MonthCalendar({ logs, month, year }: { logs: AttendanceLog[]; month: number; year: number }) {
  const logMap    = Object.fromEntries(logs.map((l) => [l.date.slice(0, 10), l]));
  const firstDay  = new Date(year, month - 1, 1).getDay();
  const daysInMth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number | null; log: AttendanceLog | null; isSunday: boolean }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, log: null, isSunday: false });
  for (let d = 1; d <= daysInMth; d++) {
    const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow = new Date(year, month - 1, d).getDay();
    cells.push({ day: d, log: logMap[key] ?? null, isSunday: dow === 0 });
  }

  return (
    <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">{monthName(month)} {year}</h3>
      <div className="grid grid-cols-7 gap-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day) return <div key={`e${i}`} />;
          if (cell.isSunday) return (
            <div key={cell.day} className={`rounded border text-center py-1.5 text-xs ${TYPE_COLORS.WEEKEND}`}>{cell.day}</div>
          );
          const type     = cell.log?.type ?? "ABSENT";
          const today    = new Date();
          const isToday  = today.getDate() === cell.day && today.getMonth() === month - 1 && today.getFullYear() === year;
          const isFuture = new Date(year, month - 1, cell.day) > today;
          return (
            <div key={cell.day}
              title={cell.log ? `${type} — In: ${fmtTime(cell.log.clockIn)} Out: ${fmtTime(cell.log.clockOut)}` : "No record"}
              className={`rounded border text-center py-1.5 text-xs cursor-default
                ${isFuture ? "bg-card text-muted-foreground/30 border-border/50" :
                  cell.log ? (TYPE_COLORS[type] ?? TYPE_COLORS.ABSENT) : "bg-red-500/10 text-red-500 border-red-500/20"}
                ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries({ PRESENT:"Present", ABSENT:"Absent", HALF_DAY:"Half Day", LEAVE:"Leave", WFH:"WFH", COMP_OFF:"Comp Off", WEEKEND:"Weekend" }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm border ${TYPE_COLORS[k]}`} />
            <span className="text-[11px] text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: AttendanceSummary }) {
  const cards = [
    { label: "Present",   value: summary.presentDays,                   color: "text-emerald-600" },
    { label: "Absent",    value: Math.max(0, summary.absentDays),        color: "text-red-500" },
    { label: "Half Days", value: summary.halfDays,                       color: "text-amber-500" },
    { label: "Leave",     value: summary.leaveDays,                      color: "text-blue-500" },
    { label: "WFH",       value: summary.wfhDays ?? 0,                   color: "text-cyan-500" },
    { label: "Comp Off",  value: summary.compOffDays ?? 0,               color: "text-primary" },
    { label: "Late",      value: fmtMins(summary.totalLateMinutes),      color: "text-amber-600" },
    { label: "Overtime",  value: fmtMins(summary.totalOvertimeMinutes),  color: "text-violet-600" },
  ];
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {cards.map((c, i) => (
        <div key={c.label} className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-3 text-center" style={{ animationDelay: `${i * 40}ms` }}>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Override Modal ───────────────────────────────────────────────────────────

// Returns "HH:MM" in local timezone — used for <input type="time"> display
function toLocalTimeStr(isoStr?: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// Converts local "HH:MM" on a given date to a UTC ISO string for the backend
function toUTCISO(dateStr: string, localTime: string): string {
  return new Date(`${dateStr}T${localTime}:00`).toISOString();
}

function calcWorkHours(dateStr: string, inTime: string, outTime: string): string {
  if (!inTime || !outTime) return "";
  const ci = new Date(`${dateStr}T${inTime}:00`);
  const co = new Date(`${dateStr}T${outTime}:00`);
  const mins = Math.floor((co.getTime() - ci.getTime()) / 60000);
  if (mins <= 0) return "Clock out must be after clock in";
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m}m`;
}

function OverrideModal({ log, onClose, onSaved }: { log: AttendanceLog; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type:            log.type ?? "PRESENT",
    clockIn:         toLocalTimeStr(log.clockIn),
    clockOut:        toLocalTimeStr(log.clockOut),
    lateMinutes:     String(log.lateMinutes ?? 0),
    overtimeMinutes: String(log.overtimeMinutes ?? 0),
    notes:           log.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const dateStr   = log.date.slice(0, 10);
  const workPreview = calcWorkHours(dateStr, form.clockIn, form.clockOut);
  const isTimeError = workPreview.startsWith("Clock");

  async function save() {
    if (isTimeError) { alert(workPreview); return; }
    setSaving(true);
    try {
      await api.patch(`/attendance/${log.id}/override`, {
        type:            form.type,
        clockIn:         form.clockIn  ? toUTCISO(dateStr, form.clockIn)  : undefined,
        clockOut:        form.clockOut ? toUTCISO(dateStr, form.clockOut) : undefined,
        lateMinutes:     Number(form.lateMinutes),
        overtimeMinutes: Number(form.overtimeMinutes),
        notes:           form.notes || undefined,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Override Attendance</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          Employee: <span className="font-medium text-foreground">{log.employee?.user.name ?? `#${log.employeeId}`}</span>
          &nbsp;·&nbsp;Date: <span className="font-medium text-foreground">{dateStr}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as typeof f.type }))}>
              <SelectTrigger className="h-9 text-sm"><span>{form.type.replace("_"," ")}</span></SelectTrigger>
              <SelectContent>
                {["PRESENT","HALF_DAY","ABSENT","LEAVE","COMP_OFF","HOLIDAY","WFH"].map(t => (
                  <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-9 text-sm" placeholder="Optional note" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Clock In</label>
            <Input type="time" value={form.clockIn} onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Clock Out</label>
            <Input type="time" value={form.clockOut} onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))} className="h-9 text-sm" />
          </div>

          {/* Live work hours preview */}
          {(form.clockIn && form.clockOut) && (
            <div className={`col-span-2 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
              isTimeError
                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            }`}>
              {isTimeError ? "⚠ " : "✓ Work hours: "}{workPreview}
              {!isTimeError && <span className="text-emerald-500/70 font-normal">(auto-calculated)</span>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Late (min)</label>
            <Input type="number" value={form.lateMinutes} onChange={e => setForm(f => ({ ...f, lateMinutes: e.target.value }))} className="h-9 text-sm" min={0} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Overtime (min)</label>
            <Input type="number" value={form.overtimeMinutes} onChange={e => setForm(f => ({ ...f, overtimeMinutes: e.target.value }))} className="h-9 text-sm" min={0} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : "Save Override"}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Board ───────────────────────────────────────────────────────────────

function LiveBoard() {
  const [entries, setEntries] = useState<LiveBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    api.get<ApiResponse<LiveBoardEntry[]>>("/attendance/live")
      .then(r => setEntries(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    IN: "In Office", OUT: "Clocked Out", NOT_IN: "Not Clocked In",
    LEAVE: "On Leave", HOLIDAY: "Holiday", COMP_OFF: "Comp Off",
  };

  const inCount  = entries.filter(e => e.status === "IN").length;
  const outCount = entries.filter(e => e.status === "NOT_IN").length;

  const filtered = filter
    ? entries.filter(e => e.status === filter)
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-600">{inCount} In Office</div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm font-medium text-red-500">{outCount} Not Checked In</div>
        <div className="ml-auto">
          <Select value={filter} onValueChange={v => setFilter(v ?? "")}>
            <SelectTrigger className="h-9 text-sm w-44">
              <span className="text-muted-foreground">{filter ? statusLabel[filter] : "All Status"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(e => (
            <div key={e.employeeId} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {e.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.employeeCode}{e.department ? ` · ${e.department}` : ""}</p>
                <div className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LIVE_STATUS_COLORS[e.status] ?? ""}`}>
                  {statusLabel[e.status] ?? e.status}
                </div>
                {e.status === "IN" && e.clockIn && (
                  <p className="text-xs text-muted-foreground mt-0.5">Since {fmtTime(e.clockIn)}{(e.lateMinutes ?? 0) > 0 ? ` · ${e.lateMinutes}m late` : ""}</p>
                )}
                {e.status === "OUT" && e.clockOut && (
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(e.clockIn)} – {fmtTime(e.clockOut)}</p>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-8 text-center">No records found.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Team Table ───────────────────────────────────────────────────────────────

function TeamTable({ logs, summary, onOverride, refreshKey }: {
  logs: AttendanceLog[]; summary: AttendanceSummary | null;
  onOverride: (log: AttendanceLog) => void; refreshKey: number;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const empIds   = [...new Set(logs.map(l => l.employeeId))];
  const byEmp    = Object.fromEntries(empIds.map(id => [id, logs.filter(l => l.employeeId === id)]));
  const wDays    = summary?.workingDays ?? 0;

  function exportCSV() {
    const rows = [["Employee","Code","Date","Type","Clock In","Clock Out","Work Hours","Late (min)","Overtime (min)","Manual"]];
    logs.forEach(l => rows.push([
      l.employee?.user.name ?? "", l.employee?.employeeCode ?? "",
      l.date.slice(0,10), l.type,
      fmtTime(l.clockIn), fmtTime(l.clockOut),
      l.workMinutes ? String(Math.round(l.workMinutes / 60 * 10) / 10) : "",
      String(l.lateMinutes), String(l.overtimeMinutes), l.isManual ? "Yes" : "",
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `attendance_export.csv`; a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
          <Download size={12} /> Export CSV
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Employee","Present","Absent","Half Day","WFH","Late","Overtime",""].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empIds.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No records for this period.</td></tr>
              ) : empIds.map(empId => {
                const empLogs = byEmp[empId] ?? [];
                const emp     = empLogs[0]?.employee;
                const present = empLogs.filter(l => l.type === "PRESENT").length;
                const half    = empLogs.filter(l => l.type === "HALF_DAY").length;
                const leave   = empLogs.filter(l => l.type === "LEAVE").length;
                const compOff = empLogs.filter(l => l.type === "COMP_OFF").length;
                const wfh     = empLogs.filter(l => l.type === "WFH").length;
                const absent  = Math.max(0, wDays - present - half - leave - compOff - wfh);
                const lateMin = empLogs.reduce((s, l) => s + (l.lateMinutes ?? 0), 0);
                const otMin   = empLogs.reduce((s, l) => s + (l.overtimeMinutes ?? 0), 0);
                const isOpen  = expanded === empId;
                return (
                  <>
                    <tr key={empId} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{emp?.user.name ?? `Employee #${empId}`}</p>
                        <p className="text-xs text-muted-foreground font-mono">{emp?.employeeCode}</p>
                      </td>
                      <td className="px-4 py-2 text-center text-emerald-600 font-semibold">{present}</td>
                      <td className="px-4 py-2 text-center text-red-500 font-semibold">{absent}</td>
                      <td className="px-4 py-2 text-center text-amber-500 font-semibold">{half}</td>
                      <td className="px-4 py-2 text-center text-cyan-500 font-semibold">{wfh}</td>
                      <td className="px-4 py-2 text-center text-amber-600">{fmtMins(lateMin)}</td>
                      <td className="px-4 py-2 text-center text-primary">{fmtMins(otMin)}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setExpanded(isOpen ? null : empId)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                          {isOpen ? "Collapse ▲" : "Details ▼"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && empLogs.map(log => (
                      <tr key={log.id} className="border-b border-border bg-primary/5">
                        <td className="px-8 py-2 text-xs text-muted-foreground">
                          {new Date(log.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                        </td>
                        <td className="px-4 py-2" colSpan={2}>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 border text-xs font-medium ${TYPE_COLORS[log.type] ?? ""}`}>
                            {log.type.replace("_"," ")}
                          </span>
                          {log.isManual && <span className="ml-1 text-[11px] text-muted-foreground">(manual)</span>}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground" colSpan={2}>{fmtTime(log.clockIn)} → {fmtTime(log.clockOut)}</td>
                        <td className="px-4 py-2 text-xs text-amber-500">{(log.lateMinutes ?? 0) > 0 ? `${log.lateMinutes}m late` : ""}</td>
                        <td className="px-4 py-2 text-xs text-primary">{(log.overtimeMinutes ?? 0) > 0 ? `+${fmtMins(log.overtimeMinutes)}` : ""}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => onOverride(log)} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                            Override
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { user }  = useAuthStore();
  const isHR      = HR_ROLES.includes(user?.role ?? "");
  const now       = new Date();
  const [tab, setTab]               = useState<"overview" | "live" | "team">("overview");
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [logs, setLogs]             = useState<AttendanceLog[]>([]);
  const [summary, setSummary]       = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [empFilter, setEmpFilter]   = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [overrideLog, setOverrideLog] = useState<AttendanceLog | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (dateFilter) params["date"] = dateFilter;
      else { params["month"] = String(month); params["year"] = String(year); }
      if (isHR && empFilter) params["employeeId"] = empFilter;
      const endpoint = isHR ? "/attendance/team" : "/attendance/my-history";
      const [logsRes, sumRes] = await Promise.all([
        api.get<ApiResponse<AttendanceLog[]>>(endpoint, { params }),
        api.get<ApiResponse<AttendanceSummary>>("/attendance/summary", { params }),
      ]);
      setLogs(logsRes.data.data);
      setSummary(sumRes.data.data);
    } catch { /* ignore */ }
  }, [isHR, month, year, empFilter, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);
  useEffect(() => {
    if (isHR) api.get<ApiResponse<Employee[]>>("/employees").then(r => setEmployees(r.data.data)).catch(() => {});
  }, [isHR]);

  const monthOpts = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }));
  const yearOpts  = [now.getFullYear() - 1, now.getFullYear()].map(y => ({ value: String(y), label: String(y) }));
  const empOpts   = employees.map(e => ({ value: String(e.id), label: e.user.name }));
  const hasFilters = !!(empFilter || dateFilter || month !== now.getMonth() + 1 || year !== now.getFullYear());

  function clearFilters() { setEmpFilter(""); setDateFilter(""); setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }

  // HR tab navigation
  const hrTabs = [
    { id: "team",     label: "Team Overview", icon: Users },
    { id: "live",     label: "Live Board",    icon: Activity },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Employee: clock widget */}
      {!isHR && <ClockWidget onRefresh={() => setRefreshKey(k => k + 1)} />}

      {/* HR: tab switcher + nav links */}
      {isHR && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border">
            {hrTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/attendance/regularize" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-muted">
              <ClipboardList size={13} /> Regularize
            </Link>
            <Link href="/attendance/wfh" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-muted">
              <Plane size={13} /> WFH
            </Link>
            <Link href="/attendance/report" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-muted">
              <Download size={13} /> Reports
            </Link>
          </div>
        </div>
      )}

      {/* Live board tab */}
      {isHR && tab === "live" && <LiveBoard />}

      {/* Team / employee main content */}
      {tab !== "live" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap animate-fade-in delay-100">
            <FilterSelect label="Month" value={String(month)} options={monthOpts}
              onChange={v => setMonth(v === "" ? now.getMonth() + 1 : Number(v))} width="w-44" placeholder="This Month" />
            <FilterSelect label="Year" value={String(year)} options={yearOpts}
              onChange={v => setYear(v === "" ? now.getFullYear() : Number(v))} width="w-32" placeholder="This Year" />
            {isHR && (
              <>
                <FilterSelect label="Employee" value={empFilter} options={empOpts} onChange={setEmpFilter} width="w-48" />
                <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 w-40 text-sm" />
              </>
            )}
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity">
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {summary && <SummaryCards summary={summary} />}

          {!isHR && <MonthCalendar logs={logs} month={month} year={year} />}

          {isHR && (
            <TeamTable logs={logs} summary={summary} refreshKey={refreshKey}
              onOverride={(log) => setOverrideLog(log)} />
          )}
        </>
      )}

      {/* Override modal */}
      {overrideLog && (
        <OverrideModal
          log={overrideLog}
          onClose={() => setOverrideLog(null)}
          onSaved={() => { setRefreshKey(k => k + 1); fetchData(); }}
        />
      )}
    </div>
  );
}
