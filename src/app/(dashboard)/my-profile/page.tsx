"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import {
  Lock, Clock, X, Send,
  User, Phone, Mail, MapPin, Shield, Banknote,
  CalendarDays, Briefcase, ChevronRight, AlertCircle,
  FileText, CheckCircle2, XCircle, RefreshCw, Camera,
  ListTodo, TrendingUp, Flame,
  ChevronDown, ChevronUp, FolderOpen, FileCheck, Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivePermission { id: number; fieldName: string; expiresAt: string; grantedAt: string; }
interface ChangeRequest {
  id: number; uuid: string; fieldName: string; fieldLabel: string;
  currentValue: string | null; requestedValue: string; reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null; reviewedAt: string | null; createdAt: string;
}
interface Profile {
  user: { id: number; name: string; email: string; role: string; status: string; avatarUrl: string | null };
  employee: {
    id: number; employeeCode: string; department: string | null; designation: string | null;
    joiningDate: string; shiftStart: string; shiftEnd: string; status: string;
    phone: string | null; personalEmail: string | null; officialEmail: string | null;
    dateOfBirth: string | null; gender: string | null; maritalStatus: string | null;
    nationality: string | null; bloodGroup: string | null; workMode: string | null;
    workLocation: string | null; educationQualification: string | null;
  };
  address: { flatDoor: string; street: string; city: string; pinCode: string; state: string; country: string } | null;
  emergencyContacts: Array<{ id: number; name: string; relationship: string; phone: string; email: string | null }>;
  bankDetails: { bankName: string | null; accountNumberMasked: string; ifscCode: string | null; panNumberMasked: string; aadhaarNumberMasked: string; accountHolderName: string | null } | null;
  leaveBalance: { casualTotal: number; casualUsed: number; sickTotal: number; sickUsed: number; paidTotal: number; paidUsed: number; compOff: number } | null;
  activePermissions: ActivePermission[];
  pendingRequestCount: number;
}
interface AttendanceRow { date: string; clockIn: string | null; clockOut: string | null; type: string; lateMinutes: number; workMinutes: number | null; }
interface LeaveRow { uuid: string; leaveType: string; fromDate: string; toDate: string; days: number; reason: string | null; status: string; reviewNote: string | null; createdAt: string; }
interface PayslipRow {
  id: number; month: number; year: number;
  baseSalary: number; grossSalary: number; netSalary: number;
  bonus: number; lateDeduction: number; otherDeduction: number;
  overtimeAmount: number; lopDays: number;
  workingDays: number; presentDays: number;
  status: string; paidAt: string | null;
}
interface TaskRow { uuid: string; title: string; status: string; priority: string; dueDate: string | null; clientName: string | null; }
interface TaskStats { todayTasks: number; completedToday: number; inProgress: number; inReview: number; overdue: number; completedThisMonth: number; }
interface TodoStats { today: number; important: number; assigned: number; overdue: number; completed: number; }
interface DocRow { id: number; docType: string; docCategory: string | null; name: string; filePath: string; isMandatory: boolean; verificationStatus: string | null; expiryDate: string | null; createdAt: string; }
interface AgreementRow { uuid: string; agreementType: string; name: string; filePath: string; version: string | null; signedAt: string | null; notes: string | null; createdAt: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(status: string) {
  if (status === "PENDING")  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(234,179,8,0.12)", color: "#ca8a04" }}><Clock size={10} />Pending</span>;
  if (status === "APPROVED") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}><CheckCircle2 size={10} />Approved</span>;
  if (status === "REJECTED") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}><XCircle size={10} />Rejected</span>;
  return null;
}

function priorityColor(p: string) {
  const map: Record<string, string> = { URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#6b7280" };
  return map[p] ?? "#6b7280";
}

const RESTRICTED_FIELDS = [
  { key: "name",           label: "Full Name",           section: "identity" },
  { key: "official_email", label: "Official Email",      section: "identity" },
  { key: "bank_account",   label: "Bank Account Number", section: "bank" },
  { key: "bank_ifsc",      label: "IFSC Code",           section: "bank" },
  { key: "bank_name",      label: "Bank Name",           section: "bank" },
  { key: "pan_number",     label: "PAN Number",          section: "bank" },
  { key: "aadhaar_number", label: "Aadhaar Number",      section: "bank" },
];

// ─── ChangeRequestModal ───────────────────────────────────────────────────────

// ─── AvatarUploadZone ─────────────────────────────────────────────────────────

// ─── DocumentsTab ─────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER:    "Offer Letter",
  CONTRACT:        "Contract",
  ID_PROOF:        "ID Proof",
  AADHAAR:         "Aadhaar Card",
  PAN:             "PAN Card",
  APPRAISAL:       "Appraisal",
  EDUCATION_CERT:  "Highest Education Certificate",
  BANK_PASSBOOK:   "Bank Passbook / Cancelled Cheque",
  RESUME:          "Resume",
  EXPERIENCE_CERT: "Experience Certificate",
  OTHER:           "Other",
};

const VERIFICATION_STYLE: Record<string, { bg: string; text: string }> = {
  verified: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  rejected: { bg: "bg-red-500/10",     text: "text-red-600"     },
  pending:  { bg: "bg-amber-500/10",   text: "text-amber-600"   },
};

// Labels match the slot names used by the admin wizard AND stored by the upload endpoint
const UPLOAD_SLOTS = [
  { fieldKey: "doc_aadhaar",        label: "Aadhaar Card" },
  { fieldKey: "doc_pan",            label: "PAN Card" },
  { fieldKey: "doc_bank_passbook",  label: "Bank Passbook / Cancelled Cheque" },
  { fieldKey: "doc_education_cert", label: "Highest Education Certificate" },
  { fieldKey: "doc_resume",         label: "Resume" },
] as const;

const OPTIONAL_SLOTS = [
  { fieldKey: "doc_passport",         label: "Passport",              maxDocs: 1 },
  { fieldKey: "doc_experience_cert",  label: "Experience Certificate", maxDocs: 1 },
  { fieldKey: "doc_last_payslips",    label: "Last 3 Payslips",        maxDocs: 3 },
  { fieldKey: "doc_relieving_letter", label: "Relieving Letter",       maxDocs: 1 },
  { fieldKey: "doc_skill_cert",       label: "Skill Certificates",     maxDocs: 1 },
] as const;

function DocumentsTab({
  docs, loading, pendingRequests, onRefresh,
}: {
  docs: DocRow[];
  loading: boolean;
  pendingRequests: ChangeRequest[];
  onRefresh: () => void;
}) {
  const [docModal,   setDocModal]   = useState<{ fieldKey: string; label: string } | null>(null);
  const [docFile,    setDocFile]    = useState<File | null>(null);
  const [docReason,  setDocReason]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [optOpen,    setOptOpen]    = useState(false);


  function closeDocModal() {
    setDocModal(null);
    setDocFile(null);
    setDocReason("");
  }

  async function handleDocRequest() {
    if (!docModal || !docFile || !docReason.trim()) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", docFile);
      form.append("fieldName", docModal.fieldKey);
      form.append("reason", docReason.trim());
      await api.post("/me/change-requests/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Change request submitted. Admin will review and apply it.");
      closeDocModal();
      onRefresh();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const knownLabels   = new Set([
    ...UPLOAD_SLOTS.map(s => s.label.toLowerCase()),
    ...OPTIONAL_SLOTS.map(s => s.label.toLowerCase()),
  ]);
const slotsUploaded = UPLOAD_SLOTS.filter(s =>
    docs.some(d => (d.name ?? "").toLowerCase() === s.label.toLowerCase())
  ).length;
  const optUploaded  = OPTIONAL_SLOTS.filter(s =>
    docs.some(d => (d.name ?? "").toLowerCase() === s.label.toLowerCase())
  ).length;

  return (
    <div className="space-y-4">

      {/* ── Slot rows ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileCheck size={14} className="text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">My Documents</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Upload your documents or request a change</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            slotsUploaded >= UPLOAD_SLOTS.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>{slotsUploaded} / {UPLOAD_SLOTS.length}</span>
        </div>

        <div className="px-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : UPLOAD_SLOTS.map(slot => {
            const doc     = docs.find(d => (d.name ?? "").toLowerCase() === slot.label.toLowerCase());
            const fileUrl = doc?.filePath ? (resolveAssetUrl(doc.filePath) ?? doc.filePath) : null;

            return (
              <div key={slot.fieldKey} className="flex items-center gap-3 py-3.5 border-b border-border/50 last:border-0">
                <CheckCircle2 size={16}
                  className={`shrink-0 ${doc ? "text-emerald-500" : "text-muted-foreground/25"}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{slot.label}</p>
                  {doc ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Uploaded {formatDate(doc.createdAt)}
                      {doc.expiryDate ? ` · Expires ${formatDate(doc.expiryDate)}` : ""}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 mt-0.5">Not uploaded</p>
                  )}
                </div>

                {fileUrl && (
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={fileUrl} target="_blank" rel="noreferrer"
                      className="text-xs font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors"
                      style={{ color: "var(--text-primary)" }}>
                      View
                    </a>
                  </div>
                )}

                <button
                  onClick={() => setDocModal({ fieldKey: slot.fieldKey, label: slot.label })}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                >
                  <Send size={11} />{doc ? "Change" : "Upload"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Optional Documents ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button type="button"
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
          onClick={() => setOptOpen(v => !v)}>
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <FolderOpen size={14} className="text-amber-600" />
          </span>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-foreground">Optional Documents</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Passport, experience certificate, payslips, etc.</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
            optUploaded > 0 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}>{optUploaded} / {OPTIONAL_SLOTS.length}</span>
          {optOpen
            ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
            : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
        </button>

        {optOpen && (
          <div className="px-5 border-t border-border">
            {OPTIONAL_SLOTS.map(slot => {
              // For multi-upload slots collect all docs; for others just the first match
              const slotDocs = docs.filter(d => (d.name ?? "").toLowerCase() === slot.label.toLowerCase());
              const doc      = slotDocs[0];
              const pending  = pendingRequests.some(r => r.fieldName === slot.fieldKey && r.status === "PENDING");
              const canAdd   = !pending && slotDocs.length < slot.maxDocs;

              return (
                <div key={slot.fieldKey} className="py-3.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16}
                      className={`shrink-0 ${slotDocs.length > 0 ? "text-emerald-500" : "text-muted-foreground/25"}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{slot.label}</p>
                        {slot.maxDocs > 1 && slotDocs.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(0,196,167,0.1)", color: "#00C4A7", border: "1px solid rgba(0,196,167,0.25)" }}>
                            {slotDocs.length}/{slot.maxDocs} collected
                          </span>
                        )}
                      </div>
                      {doc ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Uploaded {formatDate(doc.createdAt)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600/80 mt-0.5">Not uploaded</p>
                      )}
                    </div>

                    {/* View links — for multi-upload show first; extra shown below */}
                    {doc?.filePath && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={resolveAssetUrl(doc.filePath) ?? doc.filePath} target="_blank" rel="noreferrer"
                          className="text-xs font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors"
                          style={{ color: "var(--text-primary)" }}>
                          View
                        </a>
                      </div>
                    )}

                    {/* Action */}
                    {pending ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.25)" }}>
                        <Clock size={10} />Pending
                      </span>
                    ) : canAdd ? (
                      <button
                        onClick={() => setDocModal({ fieldKey: slot.fieldKey, label: slot.label })}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                      >
                        <Send size={11} />{doc ? (slot.maxDocs > 1 ? "Add" : "Change") : "Upload"}
                      </button>
                    ) : null}
                  </div>

                  {/* Extra payslip docs (2nd, 3rd) */}
                  {slotDocs.length > 1 && slotDocs.slice(1).map((xd, i) => {
                    const xUrl = xd.filePath ? (resolveAssetUrl(xd.filePath) ?? xd.filePath) : null;
                    return (
                      <div key={xd.id} className="ml-8 mt-1.5 flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground flex-1">
                          Payslip {i + 2} — Uploaded {formatDate(xd.createdAt)}
                        </p>
                        {xUrl && (
                          <a href={xUrl} target="_blank" rel="noreferrer"
                            className="text-xs font-medium px-2 py-0.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                            style={{ color: "var(--text-primary)" }}>
                            View
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Per-slot Doc Change Request Modal ── */}
      {docModal && (
        <Dialog open onOpenChange={closeDocModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Send size={16} style={{ color: "var(--accent)" }} />
                Request Change: {docModal.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="rounded-xl px-3 py-2.5 text-xs"
                style={{ background: "rgba(0,196,167,0.06)", border: "1px solid rgba(0,196,167,0.2)", color: "var(--text-secondary)" }}>
                Upload your new document below. Admin will verify it against your reason and apply the change if approved.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">New Document <span className="text-red-500">*</span></Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                  className="h-9 text-sm"
                />
                {docFile && (
                  <p className="text-[11px] text-muted-foreground">{docFile.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  value={docReason}
                  onChange={e => setDocReason(e.target.value)}
                  placeholder="Why do you need to change this document?"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeDocModal} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" size="sm"
                disabled={submitting || !docFile || !docReason.trim()}
                onClick={handleDocRequest}
                className="bg-primary hover:bg-primary/85 text-primary-foreground">
                {submitting
                  ? <><RefreshCw size={12} className="animate-spin mr-1.5" />Submitting…</>
                  : <><Send size={12} className="mr-1.5" />Submit Request</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── AgreementsTab ────────────────────────────────────────────────────────────

const AGREEMENT_SLOTS = [
  { type: "offer_letter",         label: "Offer Letter" },
  { type: "appointment_letter",   label: "Appointment Letter" },
  { type: "nda",                  label: "NDA" },
  { type: "employment_agreement", label: "Employment Agreement" },
  { type: "leave_policy",         label: "Leave Policy" },
  { type: "it_policy",            label: "IT Policy" },
  { type: "code_of_conduct",      label: "Code of Conduct" },
] as const;

function AgreementsTab({ agreements, loading }: { agreements: AgreementRow[]; loading: boolean }) {
  const signedCount = agreements.filter(a => a.signedAt).length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <Shield size={14} className="text-violet-600" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">Signed Agreements</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Employment agreements and policy acknowledgements</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          signedCount >= AGREEMENT_SLOTS.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>{signedCount} / {AGREEMENT_SLOTS.length}</span>
      </div>

      {/* Slot rows */}
      <div className="px-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : AGREEMENT_SLOTS.map(slot => {
          const ag      = agreements.find(a => a.agreementType === slot.type);
          const signed  = !!(ag?.signedAt);
          const hasFile = !!(ag?.filePath);
          const fileUrl = ag?.filePath ? (resolveAssetUrl(ag.filePath) ?? ag.filePath) : null;

          return (
            <div key={slot.type} className="flex items-center gap-3 py-3.5 border-b border-border/50 last:border-0">
              <CheckCircle2 size={16}
                className={`shrink-0 ${signed ? "text-emerald-500" : hasFile ? "text-amber-400" : "text-muted-foreground/25"}`} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{slot.label}</p>
                {ag ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ag.version ? `${ag.version} · ` : ""}Uploaded {formatDate(ag.createdAt)}
                    {signed ? ` · Signed ${formatDate(ag.signedAt)}` : ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Not uploaded</p>
                )}
              </div>

              {/* Signed / Unsigned badge */}
              {ag && (
                signed ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-emerald-500/10 text-emerald-600">
                    Signed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-amber-500/10 text-amber-600">
                    Unsigned
                  </span>
                )
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PayslipsPanel ────────────────────────────────────────────────────────────

function PayslipsPanel({ payslips }: { payslips: PayslipRow[] }) {
  const [yearFilter,   setYearFilter]   = useState("");
  const [monthFilter,  setMonthFilter]  = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const years = Array.from(new Set(payslips.map(p => String(p.year)))).sort((a, b) => Number(b) - Number(a));

  const filtered = payslips.filter(p => {
    if (yearFilter   && String(p.year)   !== yearFilter)   return false;
    if (monthFilter  && String(p.month)  !== monthFilter)  return false;
    if (statusFilter && p.status         !== statusFilter) return false;
    return true;
  });

  const hasFilters = !!(yearFilter || monthFilter || statusFilter);
  function clearFilters() { setYearFilter(""); setMonthFilter(""); setStatusFilter(""); }

  const statusColors: Record<string, { bg: string; text: string }> = {
    PAID:     { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    APPROVED: { bg: "bg-blue-500/10",    text: "text-blue-600"    },
  };

  return (
    <div className="space-y-4">
      {/* Filters — clients page style */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Year filter */}
        <Select value={yearFilter} onValueChange={v => setYearFilter(v === "__all__" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <span className="flex items-center gap-1 truncate">
              <span className="text-muted-foreground shrink-0">Year:</span>
              <span>{yearFilter || "All"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Month filter */}
        <Select value={monthFilter} onValueChange={v => setMonthFilter(v === "__all__" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <span className="flex items-center gap-1 truncate">
              <span className="text-muted-foreground shrink-0">Month:</span>
              <span>{monthFilter ? MONTH_NAMES[Number(monthFilter) - 1] : "All"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "__all__" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <span className="flex items-center gap-1 truncate">
              <span className="text-muted-foreground shrink-0">Status:</span>
              <span>{statusFilter || "All"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity"
          >
            <X size={13} />Clear
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {payslips.length} payslip{payslips.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table — clients page style */}
      <div className="animate-fade-up rounded-2xl border border-border bg-card overflow-hidden">
        {payslips.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No payslips available yet. Contact HR if you believe this is incorrect.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Period", "Net Pay", "Gross Pay", "Status", "Paid On", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No payslips match the selected filters.
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const sc = statusColors[p.status] ?? { bg: "bg-muted", text: "text-muted-foreground" };
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                        ₹{Number(p.netSalary).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        ₹{Number(p.grossSalary).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {p.paidAt ? formatDate(p.paidAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DownloadPayslipButton
                          id={p.id}
                          filename={`payslip-${MONTH_NAMES[p.month - 1]}-${p.year}.pdf`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CancelLeaveButton ────────────────────────────────────────────────────────

function CancelLeaveButton({ uuid, onCancelled }: { uuid: string; onCancelled: () => void }) {
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm("Cancel this leave request?")) return;
    setLoading(true);
    try {
      await api.patch(`/leave/${uuid}/cancel`);
      toast.success("Leave request cancelled");
      onCancelled();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to cancel");
    } finally { setLoading(false); }
  }

  return (
    <button
      onClick={cancel}
      disabled={loading}
      className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all"
      style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)" }}
      title="Cancel this leave request"
    >
      {loading ? <RefreshCw size={10} className="animate-spin" /> : <X size={10} />}
      {loading ? "…" : "Cancel"}
    </button>
  );
}

// ─── DownloadPayslipButton ────────────────────────────────────────────────────

function DownloadPayslipButton({ id, filename }: { id: number; filename: string }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/${id}/payslip`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download payslip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
      style={{ background: "rgba(0,196,167,0.1)", color: "#00C4A7", border: "1px solid rgba(0,196,167,0.25)" }}
      title="Download payslip PDF"
    >
      {loading
        ? <RefreshCw size={11} className="animate-spin" />
        : <FileText size={11} />
      }
      {loading ? "…" : "Download PDF"}
    </button>
  );
}

// ─── AvatarUploadZone ─────────────────────────────────────────────────────────

function AvatarUploadZone({
  name, avatarUrl, initials, onSuccess,
}: {
  name: string; avatarUrl: string | null; initials: string;
  onSuccess: (url: string) => void;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [src,    setSrc]    = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Image must be under 5 MB"); return; }

    const reader = new FileReader();
    reader.onload = e => setSrc(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const r = await api.patch("/auth/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
      onSuccess(r.data.data.avatarUrl);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
      setSrc(null);
    } finally {
      setUploading(false);
    }
  }

  const current = src ?? resolveAssetUrl(avatarUrl);

  return (
    <div className="shrink-0 relative group cursor-pointer"
      onClick={() => !uploading && fileRef.current?.click()}
      title="Click to change photo"
    >
      <div className="h-20 w-20 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 3px rgba(0,196,167,0.25)" }}>
        {current ? (
          <img src={current} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-black"
            style={{ background: "#00C4A7" }}>
            {initials}
          </div>
        )}
        {/* Hover / uploading overlay */}
        <div className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-opacity duration-200 ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{ background: "rgba(0,0,0,0.55)" }}>
          {uploading
            ? <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <><Camera size={18} color="white" /><span className="text-[10px] text-white font-semibold">Change</span></>
          }
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── ChangeRequestModal ───────────────────────────────────────────────────────

function ChangeRequestModal({
  fieldName, fieldLabel, currentDisplay, onClose, onSuccess,
}: {
  fieldName: string; fieldLabel: string; currentDisplay: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [reason,   setReason]   = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue.trim() || !reason.trim()) return;
    setLoading(true);
    try {
      await api.post("/me/change-requests", { fieldName, newValue: newValue.trim(), reason: reason.trim() });
      toast.success("Change request submitted. Admin will review and apply it.");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit request";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send size={16} style={{ color: "var(--accent)" }} />
            Request Change: {fieldLabel}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Current value</p>
            <p style={{ color: "var(--text-primary)" }}>{currentDisplay || "—"}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">New value <span className="text-red-500">*</span></Label>
            <Input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder={`Enter new ${fieldLabel.toLowerCase()}`}
              required
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason <span className="text-red-500">*</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why do you need this change?"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading || !newValue.trim() || !reason.trim()}
              className="bg-primary hover:bg-primary/85 text-primary-foreground">
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── LockedFieldRow ───────────────────────────────────────────────────────────

function LockedFieldRow({
  fieldKey, fieldLabel, displayValue, hasPending, onRequestChange,
}: {
  fieldKey: string; fieldLabel: string; displayValue: string;
  hasPending: boolean;
  onRequestChange: () => void;
}) {
  return (
    <div className="py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{fieldLabel}</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{displayValue || "—"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasPending ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(234,179,8,0.1)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.25)" }}>
              <Clock size={10} />Pending
            </span>
          ) : (
            <button
              onClick={onRequestChange}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              title="Submit a change request for this field"
            >
              <Lock size={10} />Request Change
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DisplayFieldRow({ fieldLabel, displayValue }: { fieldLabel: string; displayValue: string }) {
  return (
    <div className="py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{fieldLabel}</p>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{displayValue || "—"}</p>
    </div>
  );
}


// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Personal", "Payslips", "Attendance", "Leaves", "Documents", "My Requests"] as const;
type Tab = typeof TABS[number];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyProfilePage() {
  const { user: authUser } = useAuth();
  const router             = useRouter();

  // Non-employee users should not access this page directly — redirect to dashboard
  useEffect(() => {
    if (authUser && authUser.role !== "EMPLOYEE") router.replace("/");
  }, [authUser, router]);

  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [attendance,     setAttendance]     = useState<AttendanceRow[]>([]);
  const [todayAtt,       setTodayAtt]       = useState<AttendanceRow | null | undefined>(undefined); // undefined = not yet fetched
  const [clockLoading,   setClockLoading]   = useState(false);
  const [leaveRequests,  setLeaveRequests]  = useState<LeaveRow[]>([]);
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);
  const [leaveForm,      setLeaveForm]      = useState({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "", isHalfDay: false, halfDaySlot: "FIRST_HALF" });
  const [leaveSubmitting,setLeaveSubmitting]= useState(false);
  const [payslips,       setPayslips]       = useState<PayslipRow[]>([]);
  const [tasks,          setTasks]          = useState<TaskRow[]>([]);
  const [myDocs,         setMyDocs]         = useState<DocRow[]>([]);
  const [myAgreements,   setMyAgreements]   = useState<AgreementRow[]>([]);
  const [docsLoading,    setDocsLoading]    = useState(false);
  const [changeReqs,     setChangeReqs]     = useState<ChangeRequest[]>([]);
  const [taskStats,      setTaskStats]      = useState<TaskStats | null>(null);
  const [todoStats,      setTodoStats]      = useState<TodoStats | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [tab,            setTab]            = useState<Tab>("Overview");
  const [requestModal,   setRequestModal]   = useState<{ fieldKey: string; fieldLabel: string; current: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const r = await api.get("/me");
      setProfile(r.data.data);
    } catch { toast.error("Failed to load profile"); }
  }, []);

  const fetchChangeReqs = useCallback(async () => {
    try {
      const r = await api.get("/me/change-requests");
      setChangeReqs(r.data.data);
    } catch { /* silent */ }
  }, []);

  const fetchTodayAtt = useCallback(async () => {
    try {
      const r = await api.get("/attendance/today");
      setTodayAtt(r.data.data ?? null);
    } catch { setTodayAtt(null); }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const r = await api.get("/leave/my-requests");
      setLeaveRequests(r.data.data ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const [docsRes, agreeRes] = await Promise.all([
        api.get("/me/documents"),
        api.get("/me/agreements"),
      ]);
      setMyDocs(docsRes.data.data ?? []);
      setMyAgreements(agreeRes.data.data ?? []);
    } catch { /* silent */ } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProfile();
      await fetchChangeReqs();
      setLoading(false);
    })();
  }, [fetchProfile, fetchChangeReqs]);

  // Lazy-load tab data
  useEffect(() => {
    if (tab === "Attendance") {
      if (todayAtt === undefined) fetchTodayAtt();
      if (attendance.length === 0)
        api.get("/attendance/my-history").then(r => setAttendance(r.data.data ?? [])).catch(() => {});
    }
    if (tab === "Leaves") {
      fetchLeaveRequests();
    }
    if (tab === "Payslips" && payslips.length === 0) {
      api.get("/me/payslips").then(r => setPayslips(r.data.data)).catch(() => {});
    }
    if (tab === "Personal" && tasks.length === 0) {
      api.get("/me/tasks").then(r => setTasks(r.data.data)).catch(() => {});
    }
    if (tab === "Overview") {
      if (tasks.length === 0)
        api.get("/me/tasks").then(r => setTasks(r.data.data)).catch(() => {});
      if (!taskStats)
        api.get("/me/task-stats").then(r => setTaskStats(r.data.data)).catch(() => {});
      if (!todoStats) {
        Promise.all([
          api.get("/todo/smart/today").catch(() => ({ data: { data: [] } })),
          api.get("/todo/smart/important").catch(() => ({ data: { data: { favoriteTasks: [] } } })),
          api.get("/todo/smart/assigned-to-me").catch(() => ({ data: { data: [] } })),
          api.get("/todo/smart/overdue").catch(() => ({ data: { data: [] } })),
          api.get("/todo/smart/completed?days=1").catch(() => ({ data: { data: [] } })),
        ]).then(([t, imp, asgn, ov, done]) => {
          setTodoStats({
            today:     (t.data.data ?? []).length,
            important: (imp.data.data?.favoriteTasks ?? []).length,
            assigned:  (asgn.data.data ?? []).length,
            overdue:   (ov.data.data ?? []).length,
            completed: (done.data.data ?? []).length,
          });
        });
      }
    }
    if (tab === "Documents") {
      fetchDocs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleClockIn() {
    setClockLoading(true);
    try {
      await api.post("/attendance/clock-in");
      toast.success("Clocked in successfully");
      await fetchTodayAtt();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to clock in");
    } finally { setClockLoading(false); }
  }

  async function handleClockOut() {
    setClockLoading(true);
    try {
      await api.post("/attendance/clock-out");
      toast.success("Clocked out successfully");
      await fetchTodayAtt();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to clock out");
    } finally { setClockLoading(false); }
  }

  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate) { toast.error("Please select dates"); return; }
    setLeaveSubmitting(true);
    try {
      await api.post("/leave", leaveForm);
      toast.success("Leave request submitted");
      setApplyLeaveOpen(false);
      setLeaveForm({ leaveType: "CASUAL", fromDate: "", toDate: "", reason: "", isHalfDay: false, halfDaySlot: "FIRST_HALF" });
      await fetchLeaveRequests();
      await fetchProfile(); // refresh leave balance
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit leave request");
    } finally { setLeaveSubmitting(false); }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(0,196,167,0.3)", borderTopColor: "#00C4A7" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No employee record found for your account.</p>
    </div>
  );

  const { user, employee, address, emergencyContacts, bankDetails, leaveBalance, pendingRequestCount } = profile;
  const initials = user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  function hasPendingRequest(fieldKey: string) {
    return changeReqs.some(r => r.fieldName === fieldKey && r.status === "PENDING");
  }

  function openRequestModal(fieldKey: string, fieldLabel: string, currentDisplay: string) {
    setRequestModal({ fieldKey, fieldLabel, current: currentDisplay });
  }

  function cardStyle(delay = 0) {
    return {
      background:   "var(--bg-surface)",
      border:       "1px solid var(--border)",
      borderRadius: "16px",
      padding:      "20px",
      animation:    `fadeUp 0.4s ease ${delay}ms both`,
    } as React.CSSProperties;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Profile Header ── */}
      <div style={{ ...cardStyle(0), padding: "24px" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar — click to upload */}
          <AvatarUploadZone
            name={user.name}
            avatarUrl={user.avatarUrl}
            initials={initials}
            onSuccess={(url) => setProfile(prev => prev ? { ...prev, user: { ...prev.user, avatarUrl: url } } : prev)}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{user.name}</h1>
              <Badge variant="outline" className="text-[11px]">{user.role.replace(/_/g, " ")}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {employee.designation && <span className="flex items-center gap-1"><Briefcase size={13} />{employee.designation}</span>}
              {employee.department  && <span className="flex items-center gap-1"><ChevronRight size={13} />{employee.department}</span>}
              <span className="flex items-center gap-1"><Mail size={13} />{user.email}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 shrink-0">
            {[
              { label: "Emp Code",   value: employee.employeeCode },
              { label: "Joined",     value: formatDate(employee.joiningDate) },
              { label: "Work Mode",  value: employee.workMode ?? "—" },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2 rounded-xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Leave balance mini strip */}
        {leaveBalance && (
          <div className="mt-5 pt-4 flex flex-wrap gap-4" style={{ borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Casual", used: leaveBalance.casualUsed, total: leaveBalance.casualTotal, color: "#6366f1" },
              { label: "Sick",   used: leaveBalance.sickUsed,   total: leaveBalance.sickTotal,   color: "#f97316" },
              { label: "Paid",   used: leaveBalance.paidUsed,   total: leaveBalance.paidTotal,   color: "#00C4A7" },
              { label: "Comp Off",used: leaveBalance.compOff,   total: leaveBalance.compOff,     color: "#8b5cf6" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {l.label}: <strong style={{ color: "var(--text-primary)" }}>{l.label === "Comp Off" ? l.total : `${l.total - l.used} left`}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", width: "fit-content" }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150"
            style={tab === t
              ? { background: "#03C4A7", color: "#000" }
              : { color: "var(--text-secondary)", background: "transparent" }
            }
          >
            {t}
            {t === "My Requests" && pendingRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: "#ef4444" }}>{pendingRequestCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* OVERVIEW — task metrics + todo stats + priority tasks */}
      {tab === "Overview" && (
        <div className="space-y-5">

          {/* ── Row 1: Task Metrics ── */}
          <div style={cardStyle(0)}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <TrendingUp size={13} />Tasks
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Today's Tasks",          value: taskStats?.todayTasks         ?? "—", color: "#6366f1" },
                { label: "Completed Today",         value: taskStats?.completedToday     ?? "—", color: "#00C4A7" },
                { label: "In Progress",             value: taskStats?.inProgress         ?? "—", color: "#f97316" },
                { label: "In Review",               value: taskStats?.inReview           ?? "—", color: "#8b5cf6" },
                { label: "Overdue",                 value: taskStats?.overdue            ?? "—", color: "#ef4444" },
                { label: "Completed This Month",    value: taskStats?.completedThisMonth ?? "—", color: "#0891b2" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-1 leading-snug" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: To-Do Metrics ── */}
          <div style={cardStyle(40)}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <ListTodo size={13} />To-Do
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Today",     value: todoStats?.today     ?? "—", color: "#6366f1" },
                { label: "Important", value: todoStats?.important ?? "—", color: "#ef4444" },
                { label: "Assigned",  value: todoStats?.assigned  ?? "—", color: "#f97316" },
                { label: "Overdue",   value: todoStats?.overdue   ?? "—", color: "#dc2626" },
                { label: "Completed", value: todoStats?.completed ?? "—", color: "#00C4A7" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 3: Priority Tasks ── */}
          <div style={cardStyle(80)}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <Flame size={13} />Priority Tasks
            </p>
            {tasks.filter(t => t.priority === "HIGH" || t.priority === "URGENT").length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-secondary)" }}>No high-priority tasks right now</p>
            ) : (
              <div className="space-y-2">
                {tasks
                  .filter(t => t.priority === "HIGH" || t.priority === "URGENT")
                  .map(t => (
                    <div key={t.uuid} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div className="mt-1 shrink-0 h-2.5 w-2.5 rounded-full" style={{ background: priorityColor(t.priority) }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {t.clientName && <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{t.clientName}</span>}
                          {t.dueDate && <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Due {formatDate(t.dueDate)}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${priorityColor(t.priority)}18`, color: priorityColor(t.priority) }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSONAL — profile info, restricted fields, bank, address, emergency */}
      {tab === "Personal" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left col: Personal + restricted */}
          <div className="lg:col-span-2 space-y-5">

            {/* Personal Info (free edit) */}
            <div style={cardStyle(50)}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                <User size={13} className="inline mr-1.5" />Personal Information
              </p>
              <LockedFieldRow
                fieldKey="phone" fieldLabel="Phone Number"
                displayValue={employee.phone ?? "—"}
                hasPending={hasPendingRequest("phone")}
                onRequestChange={() => openRequestModal("phone", "Phone Number", employee.phone ?? "")}
              />
              <LockedFieldRow
                fieldKey="personal_email" fieldLabel="Personal Email"
                displayValue={employee.personalEmail ?? "—"}
                hasPending={hasPendingRequest("personal_email")}
                onRequestChange={() => openRequestModal("personal_email", "Personal Email", employee.personalEmail ?? "")}
              />
              <DisplayFieldRow fieldLabel="Date of Birth" displayValue={formatDate(employee.dateOfBirth)} />
              <DisplayFieldRow fieldLabel="Gender" displayValue={employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : "—"} />
              <DisplayFieldRow fieldLabel="Blood Group" displayValue={employee.bloodGroup ?? "—"} />
              <DisplayFieldRow fieldLabel="Nationality" displayValue={employee.nationality ?? "—"} />
            </div>

            {/* Identity (restricted) */}
            <div style={cardStyle(100)}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                <Shield size={13} className="inline mr-1.5" />Identity Fields
              </p>
              <DisplayFieldRow fieldLabel="Full Name" displayValue={user.name} />
              <LockedFieldRow
                fieldKey="official_email" fieldLabel="Official Email" displayValue={employee.officialEmail ?? "—"}
                hasPending={hasPendingRequest("official_email")}
                onRequestChange={() => openRequestModal("official_email", "Official Email", employee.officialEmail ?? "")}
              />
            </div>

            {/* Bank & Tax */}
            <div style={cardStyle(150)}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                <Banknote size={13} className="inline mr-1.5" />Bank & Tax Details
              </p>
              <DisplayFieldRow fieldLabel="Bank Name"      displayValue={bankDetails?.bankName ?? "—"} />
              <DisplayFieldRow fieldLabel="Account Number" displayValue={bankDetails?.accountNumberMasked ?? "—"} />
              <DisplayFieldRow fieldLabel="IFSC Code"      displayValue={bankDetails?.ifscCode ?? "—"} />
              <DisplayFieldRow fieldLabel="PAN Number"     displayValue={bankDetails?.panNumberMasked ?? "—"} />
              <DisplayFieldRow fieldLabel="Aadhaar Number" displayValue={bankDetails?.aadhaarNumberMasked ?? "—"} />
            </div>
          </div>

          {/* Right col: address + emergency */}
          <div className="space-y-5">

            {/* Address */}
            <div style={cardStyle(80)}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                <MapPin size={13} className="inline mr-1.5" />Address
              </p>
              {address ? (
                <div className="text-sm space-y-0.5" style={{ color: "var(--text-primary)" }}>
                  {address.flatDoor && <p>{address.flatDoor}</p>}
                  {address.street && <p>{address.street}</p>}
                  <p>{[address.city, address.pinCode].filter(Boolean).join(" — ")}</p>
                  <p>{[address.state, address.country].filter(Boolean).join(", ")}</p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No address on file</p>
              )}
            </div>

            {/* Emergency Contacts */}
            <div style={cardStyle(110)}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                <Phone size={13} className="inline mr-1.5" />Emergency Contacts
              </p>
              {emergencyContacts.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>None on file</p>
              ) : emergencyContacts.map(c => (
                <div key={c.id} className="py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {c.relationship} · {c.phone}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab === "Attendance" && (
        <div className="space-y-5">

          {/* Today's card */}
          <div style={{ ...cardStyle(0), padding: "20px" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <Clock size={13} className="inline mr-1.5" />Today — {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
              </p>
              {/* Clock In / Out buttons */}
              {todayAtt === undefined ? null : !todayAtt ? (
                <Button size="sm" className="h-8 text-xs" style={{ background: "#00C4A7", color: "#000" }}
                  disabled={clockLoading} onClick={handleClockIn}>
                  {clockLoading ? <RefreshCw size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={13} className="mr-1" />}
                  Clock In
                </Button>
              ) : !todayAtt.clockOut ? (
                <Button size="sm" variant="outline" className="h-8 text-xs border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
                  disabled={clockLoading} onClick={handleClockOut}>
                  {clockLoading ? <RefreshCw size={12} className="animate-spin mr-1" /> : <XCircle size={13} className="mr-1" />}
                  Clock Out
                </Button>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#16a34a" }}>Done for today</span>
              )}
            </div>

            {todayAtt === undefined ? (
              <div className="flex items-center gap-2 text-sm py-2" style={{ color: "var(--text-secondary)" }}>
                <RefreshCw size={13} className="animate-spin" />Loading…
              </div>
            ) : !todayAtt ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-secondary)" }}>
                You haven&apos;t clocked in yet today.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Status",     value: todayAtt.type.replace(/_/g," "), color: todayAtt.type === "PRESENT" ? "#16a34a" : "#ca8a04" },
                  { label: "Clock In",   value: todayAtt.clockIn  ? new Date(todayAtt.clockIn).toLocaleTimeString([],{ hour:"2-digit", minute:"2-digit" }) : "—", color: "var(--text-primary)" },
                  { label: "Clock Out",  value: todayAtt.clockOut ? new Date(todayAtt.clockOut).toLocaleTimeString([],{ hour:"2-digit", minute:"2-digit" }) : "—", color: "var(--text-primary)" },
                  { label: "Work Time",  value: todayAtt.workMinutes ? `${Math.floor(todayAtt.workMinutes/60)}h ${todayAtt.workMinutes%60}m` : "—", color: "var(--text-primary)" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                    <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
            {todayAtt && todayAtt.lateMinutes > 0 && (
              <p className="text-xs mt-3 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                Late by {todayAtt.lateMinutes} minutes today
              </p>
            )}
          </div>

          {/* History table */}
          <div style={cardStyle(0)}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
              Attendance History
            </p>
            {attendance.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>No attendance records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Date","Status","Clock In","Clock Out","Work Hrs","Late (min)"].map(h => (
                        <th key={h} className="text-left pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => {
                      const tc: Record<string,string> = { PRESENT:"#16a34a", HALF_DAY:"#ca8a04", ABSENT:"#dc2626", LEAVE:"#6366f1", COMP_OFF:"#8b5cf6", HOLIDAY:"#0891b2" };
                      return (
                        <tr key={a.date} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2.5 pr-4 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{formatDate(a.date)}</td>
                          <td className="py-2.5 pr-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${tc[a.type] ?? "#6b7280"}18`, color: tc[a.type] ?? "#6b7280" }}>
                              {a.type.replace(/_/g," ")}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                            {a.clockIn ? new Date(a.clockIn).toLocaleTimeString([],{ hour:"2-digit", minute:"2-digit" }) : "—"}
                          </td>
                          <td className="py-2.5 pr-4 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                            {a.clockOut ? new Date(a.clockOut).toLocaleTimeString([],{ hour:"2-digit", minute:"2-digit" }) : "—"}
                          </td>
                          <td className="py-2.5 pr-4" style={{ color: "var(--text-primary)" }}>
                            {a.workMinutes ? `${Math.floor(a.workMinutes/60)}h ${a.workMinutes%60}m` : "—"}
                          </td>
                          <td className="py-2.5" style={{ color: a.lateMinutes > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                            {a.lateMinutes > 0 ? `+${a.lateMinutes}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAVES */}
      {tab === "Leaves" && (
        <div className="space-y-5">

          {/* Balance cards + Apply button */}
          {profile?.leaveBalance && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  <CalendarDays size={13} className="inline mr-1.5" />Leave Balance
                </p>
                <Button size="sm" className="h-8 text-xs" style={{ background: "#00C4A7", color: "#000" }}
                  onClick={() => setApplyLeaveOpen(true)}>
                  <Send size={12} className="mr-1.5" />Apply for Leave
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Casual",   used: profile.leaveBalance.casualUsed, total: profile.leaveBalance.casualTotal, color: "#6366f1" },
                  { label: "Sick",     used: profile.leaveBalance.sickUsed,   total: profile.leaveBalance.sickTotal,   color: "#f97316" },
                  { label: "Paid",     used: profile.leaveBalance.paidUsed,   total: profile.leaveBalance.paidTotal,   color: "#00C4A7" },
                  { label: "Comp Off", used: 0,                               total: profile.leaveBalance.compOff,     color: "#8b5cf6" },
                ].map(l => (
                  <div key={l.label} className="rounded-xl p-4 text-center"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      {l.total > 0 && (
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100,(l.used/l.total)*100)}%`, background: l.color }} />
                      )}
                    </div>
                    <p className="text-2xl font-bold" style={{ color: l.color }}>{l.total - l.used}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{l.label} left</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.65 }}>{l.used} / {l.total} used</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave history */}
          <div style={cardStyle(0)}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Leave History
              </p>
              {!profile?.leaveBalance && (
                <Button size="sm" className="h-8 text-xs" style={{ background: "#00C4A7", color: "#000" }}
                  onClick={() => setApplyLeaveOpen(true)}>
                  <Send size={12} className="mr-1.5" />Apply for Leave
                </Button>
              )}
            </div>
            {leaveRequests.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>No leave records yet</p>
            ) : (
              <div className="space-y-2">
                {leaveRequests.map((l, i) => {
                  const sc: Record<string, string> = { APPROVED:"#16a34a", REJECTED:"#dc2626", PENDING:"#ca8a04", CANCELLED:"#6b7280" };
                  return (
                    <div key={i} className="p-3 rounded-xl"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {l.leaveType.replace(/_/g," ")} — {l.days} day{Number(l.days) !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                          </p>
                          {l.reason && <p className="text-xs mt-0.5 italic" style={{ color: "var(--text-secondary)" }}>{l.reason}</p>}
                          {l.reviewNote && (
                            <p className="text-xs mt-1 px-2 py-1 rounded-lg"
                              style={{ background: l.status === "REJECTED" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", color: l.status === "REJECTED" ? "#dc2626" : "#16a34a" }}>
                              {l.reviewNote}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: `${sc[l.status] ?? "#6b7280"}18`, color: sc[l.status] ?? "#6b7280" }}>
                            {l.status}
                          </span>
                          {l.status === "PENDING" && (
                            <CancelLeaveButton uuid={l.uuid} onCancelled={fetchLeaveRequests} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Apply Leave Modal */}
          {applyLeaveOpen && (
            <Dialog open onOpenChange={() => setApplyLeaveOpen(false)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <CalendarDays size={16} style={{ color: "var(--accent)" }} />Apply for Leave
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleApplyLeave} className="space-y-4 pt-1">
                  {/* Leave type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Leave Type</Label>
                    <select
                      value={leaveForm.leaveType}
                      onChange={e => setLeaveForm(p => ({
                        ...p, leaveType: e.target.value,
                        // half-day not allowed for EMERGENCY/COMP_OFF
                        isHalfDay: ["EMERGENCY","COMP_OFF"].includes(e.target.value) ? false : p.isHalfDay,
                      }))}
                      className="w-full h-9 rounded-lg px-3 text-sm outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      {["CASUAL","SICK","PAID","EMERGENCY","COMP_OFF"].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                      ))}
                    </select>
                  </div>

                  {/* Half-day toggle — only for CASUAL/SICK/PAID */}
                  {["CASUAL","SICK","PAID"].includes(leaveForm.leaveType) && (
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="halfday" checked={leaveForm.isHalfDay}
                        onChange={e => setLeaveForm(p => ({
                          ...p, isHalfDay: e.target.checked,
                          toDate: e.target.checked ? p.fromDate : p.toDate,
                        }))}
                        className="h-4 w-4 rounded accent-teal-500" />
                      <Label htmlFor="halfday" className="text-xs font-medium cursor-pointer">Half day</Label>
                    </div>
                  )}

                  {/* Slot selector — shown only when half-day is checked */}
                  {leaveForm.isHalfDay && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Slot <span className="text-red-500">*</span></Label>
                      <select
                        value={leaveForm.halfDaySlot}
                        onChange={e => setLeaveForm(p => ({ ...p, halfDaySlot: e.target.value }))}
                        className="w-full h-9 rounded-lg px-3 text-sm outline-none"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <option value="FIRST_HALF">First Half (Morning)</option>
                        <option value="SECOND_HALF">Second Half (Afternoon)</option>
                      </select>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">From Date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={leaveForm.fromDate}
                        onChange={e => setLeaveForm(p => ({
                          ...p, fromDate: e.target.value,
                          toDate: p.isHalfDay ? e.target.value : (p.toDate < e.target.value ? e.target.value : p.toDate),
                        }))}
                        required className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        To Date {leaveForm.isHalfDay ? <span className="text-muted-foreground font-normal">(same as from)</span> : <span className="text-red-500">*</span>}
                      </Label>
                      <Input type="date" value={leaveForm.toDate}
                        onChange={e => setLeaveForm(p => ({ ...p, toDate: e.target.value }))}
                        required min={leaveForm.fromDate}
                        disabled={leaveForm.isHalfDay}
                        className="h-9 text-sm disabled:opacity-60" />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea value={leaveForm.reason}
                      onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                      placeholder="Brief reason for leave…" rows={3} className="text-sm resize-none" />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" size="sm" onClick={() => setApplyLeaveOpen(false)} disabled={leaveSubmitting}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={leaveSubmitting}
                      className="bg-primary hover:bg-primary/85 text-primary-foreground">
                      {leaveSubmitting ? "Submitting…" : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* DOCUMENTS & AGREEMENTS */}
      {tab === "Documents" && (
        <div className="space-y-5">
          <DocumentsTab
            docs={myDocs}
            loading={docsLoading}
            pendingRequests={changeReqs}
            onRefresh={() => { fetchProfile(); fetchChangeReqs(); fetchDocs(); }}
          />
          <AgreementsTab agreements={myAgreements} loading={docsLoading} />
        </div>
      )}

      {/* PAYSLIPS */}
      {tab === "Payslips" && (
        <PayslipsPanel payslips={payslips} />
      )}

      {/* MY REQUESTS */}
      {tab === "My Requests" && (
        <div style={cardStyle(0)}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
            <AlertCircle size={13} className="inline mr-1.5" />My Change Requests
          </p>
          {changeReqs.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>No change requests yet</p>
          ) : (
            <div className="space-y-3">
              {changeReqs.map(r => (
                <div key={r.id} className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.fieldLabel}</p>
                        {statusBadge(r.status)}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        Requested: {formatDate(r.createdAt)}
                      </p>
                      {r.reason && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Reason: {r.reason}</p>
                      )}
                      {r.status === "REJECTED" && r.reviewNote && (
                        <div className="mt-2 rounded-lg px-3 py-2 text-xs"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
                          <strong>Rejection reason:</strong> {r.reviewNote}
                        </div>
                      )}
                      {r.status === "APPROVED" && (
                        <div className="mt-2 rounded-lg px-3 py-2 text-xs"
                          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a" }}>
                          Change applied successfully.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Change Request Modal ── */}
      {requestModal && (
        <ChangeRequestModal
          fieldName={requestModal.fieldKey}
          fieldLabel={requestModal.fieldLabel}
          currentDisplay={requestModal.current}
          onClose={() => setRequestModal(null)}
          onSuccess={() => { fetchProfile(); fetchChangeReqs(); }}
        />
      )}
    </div>
  );
}
