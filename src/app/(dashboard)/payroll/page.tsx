"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/select";
import {
  Download, Eye, RefreshCw, CheckCircle, DollarSign,
  Trash2, Pencil, Loader2, X,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

const TABS = ["Calendar", "Pending", "All Request"] as const;
type Tab = typeof TABS[number];

function statusColor(s: string) {
  if (s === "PAID")     return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "APPROVED") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

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
          <span className="truncate font-medium">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="" className="text-sm">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function PayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isHR         = user?.role && ["SUPER_ADMIN","ADMIN","HR","ACCOUNTANT"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const now = new Date();
  const [tab, setTab]           = useState<Tab>("Calendar");
  const [month, setMonth]       = useState(String(now.getMonth() + 1));
  const [year, setYear]         = useState(String(now.getFullYear()));
  const [records, setRecords]   = useState<PayrollRecord[]>([]);
  const [loading, setLoading]   = useState(false);
  const [generating, setGen]    = useState(false);

  // Calendar-specific state
  const [calendarRecords, setCalendarRecords] = useState<PayrollRecord[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Pending tab: DRAFT + APPROVED records from the current month/year load
  const pendingRecords = records.filter(r => r.status === "DRAFT" || r.status === "APPROVED");

  // Bulk select — operates on whatever rows are visible in the current tab
  const tableRows = tab === "Pending" ? pendingRecords : tab === "All Request" ? records : [];
  const [selected, setSelected]    = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoad] = useState(false);
  const headerCheckRef = useRef<HTMLInputElement>(null);

  const allSelected  = tableRows.length > 0 && tableRows.every(r => selected.has(r.id));
  const someSelected = tableRows.some(r => selected.has(r.id)) && !allSelected;

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => { setSelected(new Set()); }, [month, year, tab]);

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        tableRows.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        tableRows.forEach(r => next.add(r.id));
        return next;
      });
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────
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

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const res = await api.get("/payroll", { params: { year } });
      setCalendarRecords(res.data.data);
    } catch {
      setCalendarRecords([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "Calendar") loadCalendar(); }, [tab, loadCalendar]);

  // ── Single-row actions ─────────────────────────────────────────────────────
  async function approve(id: number) {
    try { await api.patch(`/payroll/${id}/approve`); load(); }
    catch (err: unknown) { alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"); }
  }

  async function markPaid(id: number) {
    try { await api.patch(`/payroll/${id}/mark-paid`); load(); }
    catch (err: unknown) { alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"); }
  }

  async function downloadPayslip(id: number, code: string) {
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a"); a.href = url; a.download = `payslip-${code}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Payslip not available yet"); }
  }

  async function deleteRecord(id: number, name: string) {
    if (!confirm(`Permanently delete payroll record for ${name}? This cannot be undone.`)) return;
    try { await api.delete(`/payroll/${id}`); load(); }
    catch (err: unknown) { alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"); }
  }

  async function generateBatch() {
    if (!confirm(`Generate payroll for all active employees for ${MONTHS[parseInt(month)-1]} ${year}?`)) return;
    setGen(true);
    try {
      const res = await api.post("/payroll/generate-batch", { month: parseInt(month), year: parseInt(year) });
      const { generated, skipped } = res.data.data;
      alert(`Done: ${generated} generated, ${skipped} skipped`);
      load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally { setGen(false); }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function bulkApprove() {
    const targets = records.filter(r => selected.has(r.id) && r.status === "DRAFT");
    if (targets.length === 0) { alert("No DRAFT records in selection to approve"); return; }
    if (!confirm(`Approve ${targets.length} payroll record${targets.length !== 1 ? "s" : ""}?`)) return;
    setBulkLoad(true);
    const results = await Promise.allSettled(targets.map(r => api.patch(`/payroll/${r.id}/approve`)));
    const failed = results.filter(r => r.status === "rejected").length;
    setBulkLoad(false);
    setSelected(new Set());
    if (failed > 0) alert(`${targets.length - failed} approved, ${failed} failed`);
    load();
  }

  async function bulkMarkPaid() {
    const targets = records.filter(r => selected.has(r.id) && r.status === "APPROVED");
    if (targets.length === 0) { alert("No APPROVED records in selection to mark paid"); return; }
    if (!confirm(`Mark ${targets.length} payroll record${targets.length !== 1 ? "s" : ""} as paid?`)) return;
    setBulkLoad(true);
    const results = await Promise.allSettled(targets.map(r => api.patch(`/payroll/${r.id}/mark-paid`)));
    const failed = results.filter(r => r.status === "rejected").length;
    setBulkLoad(false);
    setSelected(new Set());
    if (failed > 0) alert(`${targets.length - failed} marked paid, ${failed} failed`);
    load();
  }

  async function bulkDelete() {
    const targets = records.filter(r => selected.has(r.id));
    if (!confirm(`Permanently delete ${targets.length} payroll record${targets.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkLoad(true);
    const results = await Promise.allSettled(targets.map(r => api.delete(`/payroll/${r.id}`)));
    const failed = results.filter(r => r.status === "rejected").length;
    setBulkLoad(false);
    setSelected(new Set());
    if (failed > 0) alert(`${targets.length - failed} deleted, ${failed} failed`);
    load();
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const defaultMonth = String(now.getMonth() + 1);
  const defaultYear  = String(now.getFullYear());
  const hasFilters   = month !== defaultMonth || year !== defaultYear;
  function clearFilters() { setMonth(defaultMonth); setYear(defaultYear); }

  const hasDraftSelected    = records.some(r => selected.has(r.id) && r.status === "DRAFT");
  const hasApprovedSelected = records.some(r => selected.has(r.id) && r.status === "APPROVED");

  // ── Calendar month breakdown ───────────────────────────────────────────────
  const calendarByMonth = Array.from({ length: 12 }, (_, i) => ({
    num:  i + 1,
    name: MONTHS[i],
    recs: calendarRecords.filter(r => r.month === i + 1),
  }));

  // ── Table renderer (shared by Pending and All Request) ────────────────────
  function renderTable(rows: PayrollRecord[], tableLoading: boolean, emptyLabel: string) {
    return (
      <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card overflow-hidden">
        {tableLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            {emptyLabel}
            {isHR && <p className="text-sm mt-1">Click &quot;Generate All&quot; to create them</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Period</th>
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
              {rows.map(rec => {
                const isSelected = selected.has(rec.id);
                return (
                  <tr
                    key={rec.id}
                    className={`border-b border-border last:border-0 transition-colors ${isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/40"}`}
                  >
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(rec.id)}
                        className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                        aria-label={`Select ${rec.employee?.user.name ?? rec.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {rec.employee?.user.name ?? `Employee #${rec.employeeId}`}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{rec.employee?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {MONTHS[rec.month - 1]} {rec.year}
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
                      <Badge className={`${statusColor(rec.status)} border text-xs`}>{rec.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => router.push(`/payroll/${rec.id}`)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                          title="View payslip"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {isHR && rec.status === "DRAFT" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => router.push(`/payroll/${rec.id}/edit`)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                            title="Edit adjustments"
                          >
                            <Pencil className="h-3.5 w-3.5" />
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
                            size="sm" variant="ghost"
                            onClick={() => downloadPayslip(rec.id, rec.employee?.employeeCode ?? String(rec.id))}
                            className="h-7 w-7 p-0"
                            title="Download payslip"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => deleteRecord(rec.id, rec.employee?.user.name ?? `#${rec.id}`)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-surface, hsl(var(--card)))", border: "1px solid var(--border)", width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150"
            style={tab === t
              ? { background: "var(--accent, hsl(var(--primary)))", color: "#000" }
              : { color: "var(--text-secondary, hsl(var(--muted-foreground)))" }}>
            {t}
            {t === "Pending" && pendingRecords.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: "#ef4444" }}>
                {pendingRecords.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 animate-fade-in delay-100">
        {tab !== "Calendar" && (
          <FilterSelect
            label="Month" value={month}
            onChange={v => setMonth(v === "" ? String(now.getMonth() + 1) : v)}
            width="w-44" placeholder="This Month"
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
        )}
        <FilterSelect
          label="Year" value={year}
          onChange={v => setYear(v === "" ? String(now.getFullYear()) : v)}
          width="w-32" placeholder="This Year"
          options={YEARS.map(y => ({ value: String(y), label: String(y) }))}
        />
        {tab !== "Calendar" && hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity"
          >
            <X size={13} />Clear
          </button>
        )}
        {isHR && tab !== "Calendar" && (
          <Button
            onClick={generateBatch} disabled={generating}
            className="ml-auto h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground"
          >
            {generating
              ? <><span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin mr-2" />Generating...</>
              : <><RefreshCw className="h-4 w-4 mr-2" />Generate All</>}
          </Button>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {tab !== "Calendar" && selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/5 animate-fade-in">
          <span className="text-sm font-semibold text-primary">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 flex-wrap">
            {isHR && hasDraftSelected && (
              <Button
                size="sm" onClick={bulkApprove} disabled={bulkLoading}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                Approve Selected
              </Button>
            )}
            {isHR && hasApprovedSelected && (
              <Button
                size="sm" onClick={bulkMarkPaid} disabled={bulkLoading}
                className="h-7 text-xs bg-primary hover:bg-primary/85 text-primary-foreground"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
                Mark Paid
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                size="sm" variant="outline" onClick={bulkDelete} disabled={bulkLoading}
                className="h-7 text-xs text-red-500 border-red-500/30 hover:bg-red-50 hover:border-red-300"
              >
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                Delete Selected
              </Button>
            )}
          </div>
          <Button
            size="sm" variant="ghost" onClick={() => setSelected(new Set())}
            className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Calendar Tab ── */}
      {tab === "Calendar" && (
        calendarLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-up">
            {calendarByMonth.map(({ num, name, recs }) => {
              const drafts   = recs.filter(r => r.status === "DRAFT").length;
              const approved = recs.filter(r => r.status === "APPROVED").length;
              const paid     = recs.filter(r => r.status === "PAID").length;
              const isCurrentMonth = num === now.getMonth() + 1 && year === String(now.getFullYear());
              const cardCls =
                recs.length === 0
                  ? "border-border bg-card opacity-70"
                  : paid === recs.length
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : approved > 0
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-amber-500/30 bg-amber-500/5";

              return (
                <button
                  key={num}
                  onClick={() => { setMonth(String(num)); setTab("All Request"); }}
                  className={`rounded-2xl border p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm ${cardCls}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    {isCurrentMonth && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Now</span>
                    )}
                  </div>
                  {recs.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-2">No records</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-muted-foreground">{recs.length} employee{recs.length !== 1 ? "s" : ""}</p>
                      <div className="flex gap-1 flex-wrap">
                        {drafts   > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">{drafts} Draft</span>}
                        {approved > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">{approved} Approved</span>}
                        {paid     > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">{paid} Paid</span>}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ── Pending Tab ── */}
      {tab === "Pending" && renderTable(
        pendingRecords, loading,
        `No pending payroll records for ${MONTHS[parseInt(month)-1]} ${year}`,
      )}

      {/* ── All Request Tab ── */}
      {tab === "All Request" && renderTable(
        records, loading,
        `No payroll records for ${MONTHS[parseInt(month)-1]} ${year}`,
      )}

    </div>
  );
}
