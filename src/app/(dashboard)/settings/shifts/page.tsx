"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { Shift, ApiResponse } from "@/types";

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = Number(h);
  const ampm = hr >= 12 ? "PM" : "AM";
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

function ShiftFormModal({ shift, onClose, onSaved }: {
  shift?: Shift; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!shift;
  const [form, setForm] = useState({
    name:         shift?.name         ?? "",
    startTime:    shift?.startTime    ?? "09:00",
    endTime:      shift?.endTime      ?? "18:00",
    graceMinutes: String(shift?.graceMinutes ?? 15),
    breakMinutes: String(shift?.breakMinutes ?? 60),
    isOvernight:  shift?.isOvernight  ?? false,
    isDefault:    shift?.isDefault    ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function save() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      if (isEdit) {
        await api.put(`/shifts/${shift!.id}`, {
          name:         form.name,
          startTime:    form.startTime,
          endTime:      form.endTime,
          graceMinutes: Number(form.graceMinutes),
          breakMinutes: Number(form.breakMinutes),
          isOvernight:  form.isOvernight,
          isDefault:    form.isDefault,
        });
      } else {
        await api.post("/shifts", {
          name:         form.name,
          startTime:    form.startTime,
          endTime:      form.endTime,
          graceMinutes: Number(form.graceMinutes),
          breakMinutes: Number(form.breakMinutes),
          isOvernight:  form.isOvernight,
        });
      }
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
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{isEdit ? "Edit Shift" : "Add Shift"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Shift Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start Time *</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End Time *</label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Grace Period (min)</label>
              <Input type="number" value={form.graceMinutes} onChange={e => setForm(f => ({ ...f, graceMinutes: e.target.value }))} className="h-9 text-sm" min={0} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Break Duration (min)</label>
              <Input type="number" value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: e.target.value }))} className="h-9 text-sm" min={0} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={form.isOvernight} onChange={e => setForm(f => ({ ...f, isOvernight: e.target.checked }))} className="rounded" />
              Overnight Shift
            </label>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
                Set as Default
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Shift"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftsPage() {
  const [shifts, setShifts]   = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ open: boolean; shift?: Shift }>({ open: false });
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchShifts = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<Shift[]>>("/shifts");
      // Map snake_case from API to camelCase
      const mapped = res.data.data.map((s: Record<string, unknown>) => ({
        id:           s["id"] as number,
        name:         s["name"] as string,
        startTime:    s["start_time"] as string,
        endTime:      s["end_time"] as string,
        graceMinutes: s["grace_minutes"] as number,
        breakMinutes: s["break_minutes"] as number,
        isOvernight:  Boolean(s["is_overnight"]),
        isDefault:    Boolean(s["is_default"]),
        createdAt:    s["created_at"] as string,
      }));
      setShifts(mapped);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  async function deleteShift(id: number) {
    if (!confirm("Delete this shift?")) return;
    setDeleting(id);
    try { await api.delete(`/shifts/${id}`); fetchShifts(); }
    catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error deleting"); }
    finally { setDeleting(null); }
  }

  function shiftDuration(start: string, end: string): string {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const totalMin = (eh! * 60 + em!) - (sh! * 60 + sm!);
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Shifts</h1>
          <p className="text-xs text-muted-foreground">Manage work shift timings and grace periods</p>
        </div>
        <Button size="sm" onClick={() => setModal({ open: true })} className="gap-1.5 h-9">
          <Plus size={14} /> Add Shift
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shifts.map(s => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  {s.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary mt-0.5">
                      <Check size={10} /> Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ open: true, shift: s })} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={14} />
                  </button>
                  {!s.isDefault && (
                    <button onClick={() => deleteShift(s.id)} disabled={deleting === s.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-medium">{fmtTime(s.startTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="font-medium">{fmtTime(s.endTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{shiftDuration(s.startTime, s.endTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grace</p>
                  <p className="font-medium">{s.graceMinutes} min</p>
                </div>
              </div>

              {s.isOvernight && (
                <span className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600">Overnight</span>
              )}
            </div>
          ))}
          {shifts.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-8 text-center">No shifts configured.</p>}
        </div>
      )}

      {modal.open && (
        <ShiftFormModal shift={modal.shift} onClose={() => setModal({ open: false })} onSaved={fetchShifts} />
      )}
    </div>
  );
}
