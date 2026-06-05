"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ArrowLeft, Plus, X } from "lucide-react";
import type { RegularizationRequest, ApiResponse } from "@/types";

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

function StatusBadge({ status }: { status: string }) {
  const cls = status === "APPROVED"
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
    : status === "REJECTED"
    ? "bg-red-500/10 text-red-500 border-red-500/20"
    : "bg-amber-500/15 text-amber-600 border-amber-500/25";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 border text-xs font-medium ${cls}`}>{status}</span>;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Submit Modal ─────────────────────────────────────────────────────────────

function SubmitModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    requestedClockIn:  "",
    requestedClockOut: "",
    requestedType:     "PRESENT",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.reason.trim()) { alert("Please provide a reason"); return; }
    setSaving(true);
    try {
      await api.post("/attendance/regularize", {
        date:               form.date,
        requestedClockIn:   form.requestedClockIn  || undefined,
        requestedClockOut:  form.requestedClockOut || undefined,
        requestedType:      form.requestedType,
        reason:             form.reason,
      });
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error submitting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Request Attendance Correction</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date *</label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Attendance Type *</label>
            <Select value={form.requestedType} onValueChange={v => setForm(f => ({ ...f, requestedType: v ?? f.requestedType }))}>
              <SelectTrigger className="h-9 text-sm"><span>{form.requestedType.replace("_"," ")}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="WFH">WFH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Clock In (if known)</label>
              <Input type="time" value={form.requestedClockIn} onChange={e => setForm(f => ({ ...f, requestedClockIn: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Clock Out (if known)</label>
              <Input type="time" value={form.requestedClockOut} onChange={e => setForm(f => ({ ...f, requestedClockOut: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Reason *</label>
            <textarea
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Explain why you need to correct attendance for this date…"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="flex-1">{saving ? "Submitting…" : "Submit Request"}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal (HR) ────────────────────────────────────────────────────────

function ReviewModal({ request, onClose, onDone }: { request: RegularizationRequest; onClose: () => void; onDone: () => void }) {
  const [status, setStatus]    = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setNote]  = useState("");
  const [saving, setSaving]    = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.put(`/attendance/regularize/${request.id}/review`, { status, reviewNote: reviewNote || undefined });
      onDone();
      onClose();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Review Request</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="font-medium">{request.empName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{fmtDate(request.date)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Requested Type</span><span className="font-medium">{request.requestedType?.replace("_"," ")}</span></div>
          {request.requestedClockIn && <div className="flex justify-between"><span className="text-muted-foreground">Clock In</span><span className="font-medium">{request.requestedClockIn}</span></div>}
          {request.requestedClockOut && <div className="flex justify-between"><span className="text-muted-foreground">Clock Out</span><span className="font-medium">{request.requestedClockOut}</span></div>}
          <div className="pt-1 border-t border-border">
            <p className="text-muted-foreground text-xs">Reason</p>
            <p className="mt-0.5">{request.reason}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStatus("APPROVED")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${status === "APPROVED" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600" : "border-border text-muted-foreground"}`}
          >Approve</button>
          <button
            onClick={() => setStatus("REJECTED")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${status === "REJECTED" ? "bg-red-500/10 border-red-500/20 text-red-500" : "border-border text-muted-foreground"}`}
          >Reject</button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Review Note (optional)</label>
          <Input value={reviewNote} onChange={e => setNote(e.target.value)} placeholder="Add a note…" className="h-9 text-sm" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="flex-1">{saving ? "Saving…" : "Confirm"}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RegularizePage() {
  const { user } = useAuthStore();
  const isHR     = HR_ROLES.includes(user?.role ?? "");
  const [tab, setTab]       = useState<"pending" | "all">("pending");
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewReq, setReviewReq]   = useState<RegularizationRequest | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isHR) {
        const status = tab === "pending" ? "PENDING" : "";
        const res = await api.get<ApiResponse<RegularizationRequest[]>>(
          `/attendance/regularize/pending${status ? `?status=${status}` : "?status=APPROVED&status=REJECTED"}`
        );
        // For "all" tab, fetch both approved and rejected
        if (tab === "all") {
          const [approved, rejected] = await Promise.all([
            api.get<ApiResponse<RegularizationRequest[]>>("/attendance/regularize/pending?status=APPROVED"),
            api.get<ApiResponse<RegularizationRequest[]>>("/attendance/regularize/pending?status=REJECTED"),
          ]);
          setRequests([...approved.data.data, ...rejected.data.data]);
        } else {
          setRequests(res.data.data);
        }
      } else {
        const res = await api.get<ApiResponse<RegularizationRequest[]>>("/attendance/regularize/my");
        setRequests(res.data.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isHR, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/attendance" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Attendance Regularization</h1>
            <p className="text-xs text-muted-foreground">
              {isHR ? "Review and approve employee regularization requests" : "Request corrections for missed or incorrect attendance"}
            </p>
          </div>
        </div>
        {!isHR && (
          <Button size="sm" onClick={() => setShowSubmit(true)} className="gap-1.5 h-9">
            <Plus size={14} /> New Request
          </Button>
        )}
      </div>

      {/* HR tabs */}
      {isHR && (
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
          {(["pending","all"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >{t === "pending" ? "Pending" : "Reviewed"}</button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-8 text-center">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center">No requests found.</p>
        ) : (
          <div className="divide-y divide-border">
            {requests.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 space-y-1">
                  {isHR && (
                    <p className="font-medium text-sm text-foreground">{r.empName}
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{r.empCode}</span>
                      {r.department && <span className="ml-1 text-xs text-muted-foreground">· {r.department}</span>}
                    </p>
                  )}
                  <p className="text-sm text-foreground">
                    {fmtDate(r.date)} ·{" "}
                    <span className="font-medium">{r.requestedType?.replace("_"," ")}</span>
                    {r.requestedClockIn && <span className="text-muted-foreground"> · {r.requestedClockIn} – {r.requestedClockOut}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                  {r.reviewNote && (
                    <p className="text-xs text-muted-foreground italic">Note: {r.reviewNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  {isHR && r.status === "PENDING" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewReq(r)}>
                      Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSubmit && <SubmitModal onClose={() => setShowSubmit(false)} onSubmitted={fetchData} />}
      {reviewReq  && <ReviewModal request={reviewReq} onClose={() => setReviewReq(null)} onDone={fetchData} />}
    </div>
  );
}
