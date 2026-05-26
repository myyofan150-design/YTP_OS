"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { ApiResponse, MetaOption, Subscription } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPrice(price: number | null, currency: string): string {
  if (price == null) return "—";
  const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  return `${sym[currency] ?? currency} ${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function DaysChip({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>Expired {Math.abs(daysLeft)} days ago</span>;
  if (daysLeft <= 1)
    return <span className="rounded-full px-3 py-1 text-sm font-bold animate-pulse" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>{daysLeft === 0 ? "Expires today!" : "1 day left!"}</span>;
  if (daysLeft <= 7)
    return <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: "rgba(249,115,22,0.12)", color: "#F97316" }}>{daysLeft} days left</span>;
  if (daysLeft <= 30)
    return <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>{daysLeft} days left</span>;
  return <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{daysLeft} days left</span>;
}

function MetaBadge({ option }: { option: MetaOption | null }) {
  if (!option) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `${option.color}18`, color: option.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: option.color }} />
      {option.label}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <div className="text-sm" style={{ color: "var(--text-primary)" }}>{children}</div>
    </div>
  );
}

// ─── SubscriptionDetailDialog ─────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  uuid: string | null;
  onEdit: (uuid: string) => void;
  onDeleted: () => void;
  categories: MetaOption[];
  billingCycles: MetaOption[];
  statuses: MetaOption[];
}

export function SubscriptionDetailDialog({ open, onClose, uuid, onEdit, onDeleted }: Props) {
  const { user } = useAuth();
  const canDelete = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [sub, setSub]           = useState<(Subscription & { password?: string | null }) | null>(null);
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSub = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    setSub(null);
    setShowPw(false);
    setConfirmDel(false);
    try {
      const res = await api.get<ApiResponse<Subscription & { password?: string | null }>>(`/subscriptions/${uuid}`);
      setSub(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    if (open && uuid) fetchSub();
  }, [open, uuid, fetchSub]);

  async function handleDelete() {
    if (!uuid) return;
    setDeleting(true);
    try {
      await api.delete(`/subscriptions/${uuid}`);
      toast.success("Subscription deleted");
      onDeleted();
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0" showCloseButton={false}>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
          </div>
        )}

        {!loading && !sub && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Subscription not found</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        {!loading && sub && (
          <div className="flex flex-col md:flex-row min-h-[520px]">

            {/* ── Left panel (details) ─────────────────────────────────────────── */}
            <div className="flex-1 p-6 space-y-5">

              {/* Name + logo */}
              <div className="flex items-start gap-3">
                {sub.logoUrl ? (
                  <img src={sub.logoUrl} alt={sub.name} className="h-12 w-12 rounded-full object-cover shrink-0 border border-border"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: sub.category?.color ?? "#6366F1" }}>
                    {sub.name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <DialogHeader>
                    <DialogTitle className="text-lg">{sub.name}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <MetaBadge option={sub.status} />
                    <MetaBadge option={sub.category} />
                    <MetaBadge option={sub.billingCycle} />
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={sub.autopay ? { background: "rgba(34,197,94,0.12)", color: "#22C55E" } : { background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                      {sub.autopay ? "Autopay ON" : "Manual"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price + countdown */}
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "var(--bg-elevated)" }}>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Price</p>
                  <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {fmtPrice(sub.price, sub.currency)}
                    {sub.billingCycle && <span className="text-sm font-normal ml-1" style={{ color: "var(--text-secondary)" }}>/ {sub.billingCycle.label}</span>}
                  </p>
                </div>
                <DaysChip daysLeft={sub.daysLeft} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Start Date">{fmtDate(sub.startDate)}</InfoRow>
                <InfoRow label="End Date">{fmtDate(sub.endDate)}</InfoRow>
              </div>

              {/* Link */}
              {sub.link && (
                <InfoRow label="Link">
                  <a href={sub.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                    style={{ color: "var(--accent)" }}>
                    {sub.link.replace(/^https?:\/\//, "").slice(0, 50)}
                    <ExternalLink size={12} />
                  </a>
                </InfoRow>
              )}

              {/* Credentials */}
              {(sub.username || sub.password) && (
                <div className="grid grid-cols-2 gap-4">
                  {sub.username && <InfoRow label="Username">{sub.username}</InfoRow>}
                  {sub.password !== undefined && (
                    <InfoRow label="Password">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm">
                          {showPw ? sub.password || "—" : "••••••••"}
                        </span>
                        <button onClick={() => setShowPw(v => !v)} style={{ color: "var(--text-secondary)" }}>
                          {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </InfoRow>
                  )}
                </div>
              )}

              {/* Remarks */}
              {sub.remarks && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Remarks</p>
                  <RichTextEditor value={sub.remarks} editable={false} />
                </div>
              )}
            </div>

            {/* ── Right panel (actions) ─────────────────────────────────────────── */}
            <div
              className="w-full md:w-56 shrink-0 p-5 flex flex-col gap-4"
              style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-elevated)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Actions</p>
                <button onClick={onClose} style={{ color: "var(--text-secondary)" }} className="hover:opacity-70 transition-opacity">
                  <X size={16} />
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => { onEdit(sub.uuid); onClose(); }}
              >
                <Pencil size={13} /> Edit
              </Button>

              {canDelete && !confirmDel && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setConfirmDel(true)}
                >
                  <Trash2 size={13} /> Delete
                </Button>
              )}

              {canDelete && confirmDel && (
                <div className="space-y-2 rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-xs font-medium" style={{ color: "#EF4444" }}>Delete this subscription?</p>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" className="w-full" onClick={handleDelete} disabled={deleting}
                      style={{ background: "#EF4444", color: "#fff" }}>
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setConfirmDel(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="mt-auto space-y-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <InfoRow label="Created">{fmtDate(sub.createdAt)}</InfoRow>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
