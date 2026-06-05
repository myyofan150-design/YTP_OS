"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Plus, Trash2, X, CalendarDays } from "lucide-react";
import type { Holiday, ApiResponse } from "@/types";

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  NATIONAL: "bg-red-500/10 text-red-600 border-red-500/20",
  OPTIONAL: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  COMPANY:  "bg-primary/10 text-primary border-primary/20",
};

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}

function AddHolidayModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", date: "", type: "NATIONAL" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function save() {
    if (!form.name.trim() || !form.date) { setError("Name and date are required"); return; }
    setSaving(true); setError("");
    try {
      await api.post("/holidays", form);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Add Holiday</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Holiday Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Independence Day" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date *</label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v ?? f.type }))}>
              <SelectTrigger className="h-9 text-sm"><span>{form.type}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="NATIONAL">National Holiday</SelectItem>
                <SelectItem value="OPTIONAL">Optional Holiday</SelectItem>
                <SelectItem value="COMPANY">Company Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : "Add Holiday"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function HolidaysPage() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [marking, setMarking]   = useState<number | null>(null);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Holiday[]>>(`/holidays?year=${year}`);
      const mapped = res.data.data.map((h: Record<string, unknown>) => ({
        id:        h["id"] as number,
        name:      h["name"] as string,
        date:      String(h["date"]).slice(0, 10),
        type:      h["type"] as Holiday["type"],
        createdAt: h["created_at"] as string,
      }));
      setHolidays(mapped);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  async function deleteHoliday(id: number) {
    if (!confirm("Delete this holiday?")) return;
    setDeleting(id);
    try { await api.delete(`/holidays/${id}`); fetchHolidays(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error"); }
    finally { setDeleting(null); }
  }

  async function markAttendance(holiday: Holiday) {
    if (!confirm(`Mark all active employees as HOLIDAY on ${fmtDate(holiday.date)}?`)) return;
    setMarking(holiday.id);
    try {
      const res = await api.post<ApiResponse<{ marked: number }>>("/holidays/bulk-mark", { date: holiday.date });
      alert(`Done! Marked ${res.data.data.marked} employees as HOLIDAY.`);
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error");
    } finally {
      setMarking(null);
    }
  }

  const yearOpts = [year - 1, year, year + 1];

  // Group by month
  const byMonth = holidays.reduce<Record<number, Holiday[]>>((acc, h) => {
    const m = new Date(h.date + "T00:00:00").getMonth();
    if (!acc[m]) acc[m] = [];
    acc[m]!.push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Holiday Calendar</h1>
          <p className="text-xs text-muted-foreground">Manage company holidays for attendance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="h-9 text-sm w-28"><span>{year}</span></SelectTrigger>
            <SelectContent>{yearOpts.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 h-9">
            <Plus size={14} /> Add Holiday
          </Button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries({ NATIONAL: "National", OPTIONAL: "Optional", COMPANY: "Company" }).map(([k, v]) => {
          const count = holidays.filter(h => h.type === k).length;
          return (
            <div key={k} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${HOLIDAY_TYPE_COLORS[k]}`}>
              <CalendarDays size={14} />
              <span className="text-sm font-medium">{count} {v}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-muted-foreground">
          <CalendarDays size={14} />
          <span className="text-sm font-medium">{holidays.length} Total</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : holidays.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <CalendarDays size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No holidays added for {year}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byMonth).sort(([a],[b]) => Number(a) - Number(b)).map(([m, hols]) => (
            <div key={m}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {new Date(year, Number(m), 1).toLocaleString("en-IN", { month: "long" })}
              </p>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {hols.map(h => (
                  <div key={h.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center shrink-0 w-10">
                        <p className="text-lg font-bold text-foreground leading-none">{new Date(h.date + "T00:00:00").getDate()}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.date + "T00:00:00").toLocaleString("en-IN", { weekday: "short" })}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{h.name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 border text-[10px] font-medium mt-0.5 ${HOLIDAY_TYPE_COLORS[h.type]}`}>
                          {h.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        disabled={marking === h.id}
                        onClick={() => markAttendance(h)}>
                        {marking === h.id ? "Marking…" : "Mark Attendance"}
                      </Button>
                      <button onClick={() => deleteHoliday(h.id)} disabled={deleting === h.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddHolidayModal onClose={() => setShowAdd(false)} onSaved={fetchHolidays} />}
    </div>
  );
}
