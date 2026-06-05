"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pencil, Trash2, Phone, Mail, Globe,
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

// ─── WhatsApp SVG icon ────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  // Normalise "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS"
  const iso = d.replace(" ", "T");
  const dt  = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtDate(d: string | null | undefined): string {
  const dt = safeDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDatetime(d: string | null | undefined): string {
  const dt = safeDate(d);
  if (!dt) return "—";
  return dt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

// ─── MarkLostInline ────────────────────────────────────────────────────────────

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
  open:      boolean;
  uuid:      string | null;
  onClose:   () => void;
  onEdit:    (uuid: string) => void;
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

  const handleDelete = useCallback(async () => {
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
  }, [lead, onDeleted, onClose]);

  if (!open) return null;

  const isOverdue = lead?.nextFollowup
    ? new Date(lead.nextFollowup.slice(0, 10) + "T00:00:00") < new Date(new Date().toDateString())
    : false;

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
                    <WhatsAppIcon size={14} />
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

              {/* Timeline alert */}
              {lead.nextFollowup && isOverdue && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertTriangle size={12} />
                  Follow-up overdue since {fmtDate(lead.nextFollowup)}
                </div>
              )}

              {/* Main info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Row label="Assigned To">{lead.assignedUser?.name ?? "Unassigned"}</Row>
                <Row label="Industry">{lead.industry ?? "—"}</Row>
                <Row label="Country">{lead.country ?? "—"}</Row>
                <Row label="City">{lead.city ?? "—"}</Row>
                <Row label="Budget">
                  {lead.budgetMin != null && lead.budgetMax != null
                    ? `${fmtBudget(lead.budgetMin)} – ${fmtBudget(lead.budgetMax)}`
                    : lead.budgetMin != null
                    ? `${fmtBudget(lead.budgetMin)}+`
                    : lead.budgetMax != null
                    ? `Up to ${fmtBudget(lead.budgetMax)}`
                    : "—"
                  }
                </Row>
                <Row label="Timeline">{fmtDate(lead.timeline)}</Row>
                <Row label="Last Contacted">{fmtDate(lead.lastContacted)}</Row>
                <Row label="Next Follow-up">
                  <span style={{ color: isOverdue ? "#EF4444" : "var(--text-primary)" }}>
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
