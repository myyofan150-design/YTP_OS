"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  CheckCircle2, XCircle, Clock,
  RefreshCw, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChangeRequest {
  id: number; uuid: string;
  employeeId: number; employeeName: string; employeeCode: string;
  fieldName: string; fieldLabel: string;
  currentValue: string | null; requestedValue: string;
  newDocUrl: string | null;
  reason: string; status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: number | null; reviewerName: string | null;
  reviewNote: string | null; reviewedAt: string | null; createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TABS = ["Pending Requests", "All Requests"] as const;
type Tab = typeof TABS[number];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChangeRequestsPage() {
  const [tab,           setTab]           = useState<Tab>("Pending Requests");
  const [requests,      setRequests]      = useState<ChangeRequest[]>([]);
  const [allRequests,   setAllRequests]   = useState<ChangeRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [rejectModal,   setRejectModal]   = useState<{ id: number; fieldLabel: string } | null>(null);
  const [rejectNote,    setRejectNote]    = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get("/field-permissions/requests", { params: { status: "PENDING" } }),
        api.get("/field-permissions/requests"),
      ]);
      setRequests(pendingRes.data.data);
      setAllRequests(allRes.data.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function approve(id: number) {
    setActionLoading(id);
    try {
      await api.post(`/field-permissions/requests/${id}/approve`);
      toast.success("Request approved — change applied.");
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to approve";
      toast.error(msg);
    } finally { setActionLoading(null); }
  }

  async function reject() {
    if (!rejectModal) return;
    if (!rejectNote.trim()) { toast.error("Rejection reason is required"); return; }
    setActionLoading(rejectModal.id);
    try {
      await api.post(`/field-permissions/requests/${rejectModal.id}/reject`, { reviewNote: rejectNote.trim() });
      toast.success("Request rejected");
      setRejectModal(null);
      setRejectNote("");
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to reject";
      toast.error(msg);
    } finally { setActionLoading(null); }
  }

  function cardStyle() {
    return {
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "16px", padding: "20px",
    } as React.CSSProperties;
  }

  const pendingCount = requests.length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Field Change Requests</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Validate the employee&apos;s new value and approve or reject each request
          </p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <RefreshCw size={13} />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150"
            style={tab === t ? { background: "var(--accent)", color: "#000" } : { color: "var(--text-secondary)" }}>
            {t}
            {t === "Pending Requests" && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: "#ef4444" }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(0,196,167,0.3)", borderTopColor: "#00C4A7" }} />
        </div>
      ) : (
        <>
          {/* PENDING REQUESTS */}
          {tab === "Pending Requests" && (
            <div style={cardStyle()}>
              {requests.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <CheckCircle2 size={32} style={{ color: "#00C4A7" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>All caught up!</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No pending change requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(r => (
                    <div key={r.id} className="rounded-xl p-4"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">

                          {/* Employee */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                              style={{ background: "#00C4A7" }}>
                              {r.employeeName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0,2)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.employeeName}</p>
                              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{r.employeeCode}</p>
                            </div>
                          </div>

                          {/* Field */}
                          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                            Wants to change: <strong>{r.fieldLabel}</strong>
                          </p>

                          {/* Old vs New */}
                          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                            <div className="rounded-lg p-2" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                              <p className="font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>Current</p>
                              {r.currentValue?.startsWith("http") ? (
                                <a href={r.currentValue} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 font-semibold"
                                  style={{ color: "var(--text-secondary)" }}>
                                  <ExternalLink size={11} />View Old Doc
                                </a>
                              ) : (
                                <p style={{ color: "var(--text-primary)" }}>{r.currentValue || "—"}</p>
                              )}
                            </div>
                            <div className="rounded-lg p-2" style={{ background: "rgba(0,196,167,0.06)", border: "1px solid rgba(0,196,167,0.2)" }}>
                              <p className="font-medium mb-0.5" style={{ color: "#00C4A7" }}>New Value</p>
                              {r.newDocUrl ? (
                                <a href={r.newDocUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 font-semibold"
                                  style={{ color: "#00C4A7" }}>
                                  <ExternalLink size={11} />View New Doc
                                </a>
                              ) : (
                                <p style={{ color: "var(--text-primary)" }}>{r.requestedValue}</p>
                              )}
                            </div>
                          </div>

                          {/* Reason — always shown, mandatory */}
                          <div className="rounded-lg px-3 py-2 text-xs mb-2"
                            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <span className="font-semibold" style={{ color: "#6366f1" }}>Reason: </span>
                            <span style={{ color: "var(--text-primary)" }}>{r.reason}</span>
                          </div>

                          <p className="text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                            <Clock size={9} className="inline mr-1" />Requested {formatDate(r.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0 sm:flex-col">
                          <Button size="sm"
                            className="h-8 text-xs flex-1 sm:flex-none"
                            style={{ background: "#00C4A7", color: "#000" }}
                            disabled={actionLoading === r.id}
                            onClick={() => approve(r.id)}>
                            {actionLoading === r.id ? <RefreshCw size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                            Approve
                          </Button>
                          <Button size="sm" variant="outline"
                            className="h-8 text-xs flex-1 sm:flex-none border-red-500/30 text-red-500 hover:bg-red-500/10"
                            disabled={actionLoading === r.id}
                            onClick={() => { setRejectModal({ id: r.id, fieldLabel: r.fieldLabel }); setRejectNote(""); }}>
                            <XCircle size={12} className="mr-1" />Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ALL REQUESTS */}
          {tab === "All Requests" && (
            <div style={cardStyle()}>
              {allRequests.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>No requests found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Employee","Field","New Value","Reason","Status","Reviewed By","Date"].map(h => (
                          <th key={h} className="text-left pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                            style={{ color: "var(--text-secondary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allRequests.map(r => {
                        const sc: Record<string,{bg:string;color:string}> = {
                          PENDING:  { bg: "rgba(234,179,8,0.12)",   color: "#ca8a04" },
                          APPROVED: { bg: "rgba(34,197,94,0.12)",   color: "#16a34a" },
                          REJECTED: { bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
                        };
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="py-3 pr-4">
                              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{r.employeeName}</p>
                              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{r.employeeCode}</p>
                            </td>
                            <td className="py-3 pr-4 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{r.fieldLabel}</td>
                            <td className="py-3 pr-4 max-w-[140px]" style={{ color: "var(--text-secondary)" }}>
                              {r.newDocUrl ? (
                                <a href={r.newDocUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-xs font-semibold"
                                  style={{ color: "#00C4A7" }}>
                                  <ExternalLink size={11} />View Doc
                                </a>
                              ) : (
                                <span className="truncate block">{r.requestedValue}</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 max-w-[160px] truncate text-xs" style={{ color: "var(--text-secondary)" }}>{r.reason}</td>
                            <td className="py-3 pr-4">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: sc[r.status]?.bg, color: sc[r.status]?.color }}>
                                {r.status}
                              </span>
                              {r.status === "REJECTED" && r.reviewNote && (
                                <p className="text-[10px] mt-0.5 max-w-[120px]" style={{ color: "#dc2626" }}>{r.reviewNote}</p>
                              )}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{r.reviewerName || "—"}</td>
                            <td className="py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-secondary)" }}>{formatDate(r.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Dialog open onOpenChange={() => { setRejectModal(null); setRejectNote(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-red-500">
                <XCircle size={16} />Reject: {rejectModal.fieldLabel}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="rounded-xl p-3 text-xs"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--text-secondary)" }}>
                The employee will be notified of your rejection with the reason you provide below.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Rejection reason <span className="text-red-500">*</span></Label>
                <Textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Explain why this request is being rejected…"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setRejectModal(null); setRejectNote(""); }}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive"
                disabled={!rejectNote.trim() || actionLoading === rejectModal.id}
                onClick={reject}>
                {actionLoading === rejectModal.id ? "Rejecting…" : "Confirm Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
