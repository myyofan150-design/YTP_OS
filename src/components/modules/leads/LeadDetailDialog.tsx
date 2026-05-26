"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pencil, Trash2, Phone, Mail, MessageCircle, Globe,
  ExternalLink, Flag, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, Lead, LeadMetaOption } from "@/types";
import { useLead } from "@/hooks/useLeads";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDatetime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtBudget(n: number | null): string {
  if (n == null) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function MetaBadge({ opt }: { opt: LeadMetaOption | null }) {
  if (!opt) return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${opt.color}18`, color: opt.color }}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: opt.color }} />
      {opt.label}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <div className="text-sm" style={{ color: "var(--text-primary)" }}>{children}</div>
    </div>
  );
}

// ─── MarkLostDialog ────────────────────────────────────────────────────────────

function MarkLostInline({
  uuid, onDone, onCancel,
}: { uuid: string; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function submit() {
    setSaving(true); setError("");
    try {
      await api.patch(`/leads/${uuid}/mark-lost`, { lostReason: reason || null });
      toast.success("Lead marked as lost");
      onDone();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-lg p-3 space-y-2.5 mt-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="text-sm font-medium" style={{ color: "#EF4444" }}>Mark as Lost</p>
      <div className="space-y-1">
        <Label className="text-xs">Reason (optional)</Label>
        <Input value={reason} onChange={e => setReason(e.target.value)} className="h-8 text-sm" placeholder="Why was this lead lost?" autoFocus />
      </div>
      {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium"
          style={{ background: "#EF4444", color: "#fff" }}>
          {saving ? "Saving…" : "Confirm"}
        </button>
        <button onClick={onCancel}
          className="h-7 px-3 rounded-md text-xs font-medium"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── LeadDetailDialog ─────────────────────────────────────────────────────────

interface Props {
  open:     boolean;
  uuid:     string | null;
  onClose:  () => void;
  onEdit:   (uuid: string) => void;
  onConvert: (lead: Lead) => void;
  onDeleted: () => void;
  onChanged: () => void;
}

export function LeadDetailDialog({ open, uuid, onClose, onEdit, onConvert, onDeleted, onChanged }: Props) {
  const { user: authUser } = useAuthStore();
  const isAdmin = authUser?.role === "SUPER_ADMIN" || authUser?.role === "ADMIN";

  const { lead, loading, refetch } = useLead(open ? uuid : null);

  const [showLost,      setShowLost]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState("");

  useEffect(() => {
    if (open) { setShowLost(false); setConfirmDelete(false); setDeleteError(""); }
  }, [open, uuid]);

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true); setDeleteError("");
    try {
      await api.delete(`/leads/${lead.uuid}`);
      toast.success("Lead deleted");
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setDeleteError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally { setDeleting(false); }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0">
        {loading || !lead ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {loading ? "Loading…" : "Lead not found"}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                    {lead.contactPerson}
                  </h2>
                  {lead.converted && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                      <CheckCircle2 size={11} />Converted
                    </span>
                  )}
                </div>
                {lead.companyName && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{lead.companyName}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <MetaBadge opt={lead.status} />
                  <MetaBadge opt={lead.priority} />
                  {lead.source && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${lead.source.color}14`, color: lead.source.color }}>
                      {lead.source.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} title="Call" onClick={e => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                    <Phone size={14} />
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} title="Email" onClick={e => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                    <Mail size={14} />
                  </a>
                )}
                {lead.whatsapp && (
                  <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    title="WhatsApp" onClick={e => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "rgba(37,211,102,0.12)", color: "#25D366" }}>
                    <MessageCircle size={14} />
                  </a>
                )}
                {lead.website && (
                  <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank" rel="noopener noreferrer"
                    title="Website" onClick={e => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    <Globe size={14} />
                  </a>
                )}
                <button onClick={() => onEdit(lead.uuid)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                  <Pencil size={13} />
                </button>
                {isAdmin && (
                  <button onClick={() => { setConfirmDelete(true); setShowLost(false); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Converted client link */}
              {lead.converted && lead.convertedClientUuid && (
                <a href={`/clients/${lead.convertedClientUuid}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ background: "rgba(34,197,94,0.08)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <ExternalLink size={13} />View converted client →
                </a>
              )}

              {/* Lost reason */}
              {lead.lostReason && (
                <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <span className="font-medium">Lost reason:</span> {lead.lostReason}
                </div>
              )}

              {/* Main info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Row label="Assigned To">{lead.assignedUser?.name ?? "Unassigned"}</Row>
                <Row label="Industry">{lead.industry ?? "—"}</Row>
                <Row label="Country">{lead.country ?? "—"}</Row>
                <Row label="City">{lead.city ?? "—"}</Row>
                <Row label="Budget">
                  {fmtBudget(lead.budgetMin)} – {fmtBudget(lead.budgetMax)}
                </Row>
                <Row label="Timeline">{fmtDate(lead.timeline)}</Row>
                <Row label="Last Contacted">{fmtDate(lead.lastContacted)}</Row>
                <Row label="Next Follow-up">
                  <span style={{ color: lead.nextFollowup && new Date(lead.nextFollowup) < new Date(new Date().toDateString()) ? "#EF4444" : "var(--text-primary)" }}>
                    {fmtDate(lead.nextFollowup)}
                  </span>
                </Row>
                <Row label="Meeting">{fmtDatetime(lead.meetingDatetime)}</Row>
                <Row label="Created">{fmtDate(lead.createdAt)}</Row>
              </div>

              {/* Services */}
              {lead.services.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.services.map(s => (
                      <span key={s.uuid} className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ background: `${s.color}14`, color: s.color }}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirement */}
              {lead.requirementDescription && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Requirement</p>
                  <RichTextEditor value={lead.requirementDescription} editable={false} />
                </div>
              )}

              {/* Mark lost inline */}
              {showLost && (
                <MarkLostInline
                  uuid={lead.uuid}
                  onDone={() => { refetch(); onChanged(); setShowLost(false); }}
                  onCancel={() => setShowLost(false)}
                />
              )}

              {/* Delete confirm */}
              {confirmDelete && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-sm font-medium" style={{ color: "#EF4444" }}>
                    Delete <strong>&ldquo;{lead.contactPerson}&rdquo;</strong>? This cannot be undone.
                  </p>
                  {deleteError && <p className="text-xs" style={{ color: "#EF4444" }}>{deleteError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex h-7 items-center gap-1 px-3 rounded-md text-xs font-medium"
                      style={{ background: "#EF4444", color: "#fff" }}>
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button onClick={() => { setConfirmDelete(false); setDeleteError(""); }}
                      className="h-7 px-3 rounded-md text-xs font-medium"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex gap-2">
                {!lead.converted && !lead.lostReason && (
                  <Button size="sm" variant="outline" onClick={() => { setShowLost(v => !v); setConfirmDelete(false); }}
                    className="text-xs h-8 gap-1.5">
                    <Flag size={12} />Mark as Lost
                  </Button>
                )}
                {!lead.converted && isAdmin && (
                  <Button size="sm" onClick={() => onConvert(lead)}
                    className="text-xs h-8 gap-1.5" style={{ background: "#22C55E", color: "#fff" }}>
                    <CheckCircle2 size={12} />Convert to Client
                  </Button>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
