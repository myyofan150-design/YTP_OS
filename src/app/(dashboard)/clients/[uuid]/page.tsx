"use client";

// src/app/(dashboard)/clients/[uuid]/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, MessageCircle, Calendar, Phone, Mail, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { ClientModal } from "@/components/modules/clients/ClientModal";
import { CredentialsTab } from "@/components/modules/clients/CredentialsTab";
import { DocumentsTab } from "@/components/modules/clients/DocumentsTab";
import { ContactsTab } from "@/components/modules/clients/ContactsTab";
import { PaymentsTab } from "@/components/modules/clients/PaymentsTab";
import { ActivityTab } from "@/components/modules/clients/ActivityTab";
import { StatusBadge } from "@/components/modules/clients/StatusBadge";
import { ContractBadge } from "@/components/modules/clients/ContractBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { ClientDetail, ApiResponse } from "@/types";

const TABS = ["Overview", "Contacts", "Credentials", "Documents", "Payments", "Tasks", "Activity"] as const;
type Tab = typeof TABS[number];

const CAN_EDIT    = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD"];
const CAN_CREDS   = ["SUPER_ADMIN", "ADMIN"];

const TAG_STYLES: Record<string, string> = {
  VIP:         "bg-purple-50 text-purple-700 border border-purple-200",
  Risk:        "bg-red-50 text-red-700 border border-red-200",
  "Long-term": "bg-teal-50 text-teal-700 border border-teal-200",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function RenewalAlert({ days }: { days?: number | null }) {
  if (days == null || days > 30) return null;
  const color = days <= 7 ? "red" : "amber";
  return (
    <div className={`rounded-lg border border-${color}-200 bg-${color}-50 px-4 py-3 text-sm text-${color}-700 font-medium`}>
      {days < 0 ? "Contract has expired." : days === 0 ? "Contract expires today!" : `Contract expires in ${days} day${days === 1 ? "" : "s"}.`}
    </div>
  );
}

// ─── Tracking Dialog ──────────────────────────────────────────────────────────

function TrackingDialog({
  open, onClose, onSaved, clientUuid, initial,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  clientUuid: string;
  initial: { nextFollowup?: string | null; meetingDatetime?: string | null };
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    nextFollowup:    initial.nextFollowup    ? String(initial.nextFollowup).slice(0, 10)   : "",
    meetingDatetime: initial.meetingDatetime ? String(initial.meetingDatetime).slice(0, 16): "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Re-sync when initial changes
  useEffect(() => {
    setForm({
      nextFollowup:    initial.nextFollowup    ? String(initial.nextFollowup).slice(0, 10)   : "",
      meetingDatetime: initial.meetingDatetime ? String(initial.meetingDatetime).slice(0, 16): "",
    });
  }, [initial.nextFollowup, initial.meetingDatetime]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.patch(`/clients/${clientUuid}/tracking`, {
        nextFollowup:    form.nextFollowup    || null,
        meetingDatetime: form.meetingDatetime || null,
      });
      toast.success("Tracking updated");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Update Tracking</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Next Follow-up</Label>
            <Input type="date" min={todayStr} value={form.nextFollowup}
              onChange={e => setForm(p => ({ ...p, nextFollowup: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meeting Date & Time</Label>
            <Input type="datetime-local" min={`${todayStr}T00:00`} value={form.meetingDatetime}
              onChange={e => setForm(p => ({ ...p, meetingDatetime: e.target.value }))} className="h-8 text-sm" />
          </div>
          {error && <p className="text-xs rounded px-2 py-1 bg-red-50 text-red-600 border border-red-200">{error}</p>}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notes Edit Section ────────────────────────────────────────────────────────

function NotesSection({ clientUuid, initialNotes, onRefresh }: { clientUuid: string; initialNotes?: string | null; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [notes,   setNotes]   = useState(initialNotes ?? "");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { setNotes(initialNotes ?? ""); }, [initialNotes]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/clients/${clientUuid}/notes`, { notes: notes || null });
      toast.success("Notes saved");
      setEditing(false);
      onRefresh();
    } catch {
      toast.error("Failed to save notes");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-700">Notes</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
            <Pencil size={11} />Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800">
              <Check size={11} />{saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setNotes(initialNotes ?? ""); }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X size={11} />Cancel
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this client…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">
          {notes || <span className="text-slate-400 italic">No notes yet. Click Edit to add.</span>}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { uuid } = useParams() as { uuid: string };
  const router   = useRouter();
  const { user } = useAuthStore();

  const [client, setClient]     = useState<ClientDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  const canEdit    = CAN_EDIT.includes(user?.role ?? "");
  const canCreds   = CAN_CREDS.includes(user?.role ?? "");

  const fetchClient = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<ClientDetail>>(`/clients/${uuid}`);
      setClient(res.data.data);
    } catch {
      setClient(null);
    } finally { setLoading(false); }
  }, [uuid]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  // Safe date formatting — handles ISO strings and plain date strings
  function fmtDate(s?: string | null) {
    if (!s) return null;
    // Parse date-only strings (YYYY-MM-DD) without timezone offset
    const clean = String(s).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtDatetime(s?: string | null) {
    if (!s) return null;
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading client…</div>;
  if (!client) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-sm text-slate-500">Client not found.</p>
      <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
    </div>
  );

  const isOverdue = client.nextFollowup && new Date(client.nextFollowup) < new Date(new Date().toDateString());

  return (
    <div className="space-y-5">

      {/* On Hold banner */}
      {client.status === "ON_HOLD" && client.onHoldReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
          On Hold — {client.onHoldReason}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">← Clients</button>
          <div className="mt-2 flex items-center gap-3">
            {resolveAssetUrl((client as typeof client & { logoUrl?: string | null }).logoUrl) ? (
              <img src={resolveAssetUrl((client as typeof client & { logoUrl?: string | null }).logoUrl)!}
                alt={client.companyName ?? ""} className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {(client.companyName ?? client.contactPerson).slice(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-800">{client.companyName ?? client.contactPerson}</h1>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <StatusBadge status={client.status} />
            <ContractBadge type={client.contractType} />
            {client.clientTag && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_STYLES[client.clientTag] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {client.clientTag}
              </span>
            )}
            {client.whatsapp && (
              <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>
                <MessageCircle size={13} />
              </a>
            )}
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setEditOpen(true)} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white shrink-0">
            Edit Client
          </Button>
        )}
      </div>

      <RenewalAlert days={client.daysUntilRenewal} />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t}
              {t === "Contacts"    && client.contacts.length > 0              && <span className="ml-1 text-xs text-slate-400">({client.contacts.length})</span>}
              {t === "Credentials" && client.credentials.length > 0           && <span className="ml-1 text-xs text-slate-400">({client.credentials.length})</span>}
              {t === "Documents"   && client.documents.length > 0             && <span className="ml-1 text-xs text-slate-400">({client.documents.length})</span>}
              {t === "Tasks"       && client.tasks.length > 0                 && <span className="ml-1 text-xs text-slate-400">({client.tasks.length})</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>

        {/* ── Overview ── */}
        {tab === "Overview" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Person" value={client.contactPerson} />
                <Field label="Email"          value={client.email} />
                <Field label="Phone"          value={client.phone} />
                <Field label="GST Number"     value={client.gstNumber} />
                <Field label="Country"        value={client.country} />
                <Field label="City"           value={client.city} />
              </div>
              <Field label="Address" value={client.address} />
              {/* Action links */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600">
                    <Phone size={12} />Call
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600">
                    <Mail size={12} />Email
                  </a>
                )}
                {client.whatsapp && (
                  <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#25D366" }}>
                    <MessageCircle size={12} />WhatsApp
                  </a>
                )}
                {client.website && (
                  <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600">
                    <Globe size={12} />{client.website}
                  </a>
                )}
              </div>
            </div>

            {/* Contract Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Contract Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contract Value"  value={client.totalContractValue != null ? `₹${Number(client.totalContractValue).toLocaleString("en-IN")}` : null} />
                <Field label="Renewal"         value={client.daysUntilRenewal != null ? `${client.daysUntilRenewal} days` : null} />
                <Field label="Source"          value={client.source} />
                <Field label="Contract Type"   value={client.contractType} />
                <Field label="Contract Start"  value={fmtDate(client.contractStart)} />
                <Field label="Contract End"    value={fmtDate(client.contractEnd)} />
              </div>
              {client.assignedUser && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned To</p>
                  <p className="mt-0.5 text-sm text-slate-800">
                    {client.assignedUser.name}
                    <span className="text-xs text-slate-400 ml-1">({client.assignedUser.email})</span>
                  </p>
                </div>
              )}
            </div>

            {/* Tracking */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Tracking</h2>
                <button onClick={() => setTrackOpen(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <Calendar size={11} />Update
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Next Follow-up</p>
                  <p className="mt-0.5 text-sm" style={{ color: isOverdue ? "#EF4444" : undefined }}>
                    {fmtDate(client.nextFollowup) ?? "—"}
                    {isOverdue && <span className="ml-1 text-xs">⚠ Overdue</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Meeting</p>
                  <p className="mt-0.5 text-sm text-slate-800">{fmtDatetime(client.meetingDatetime) ?? "No meeting scheduled"}</p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Services</h2>
                {canEdit && (
                  <button onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                    <Pencil size={11} />Edit
                  </button>
                )}
              </div>
              {Array.isArray(client.services) && client.services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.services.map(s => (
                    <span key={s} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No services added yet.{canEdit && " Click Edit to add."}</p>
              )}
            </div>

            {/* Notes with Edit */}
            <NotesSection clientUuid={uuid} initialNotes={client.notes} onRefresh={fetchClient} />
          </div>
        )}

        {tab === "Contacts" && (
          <ContactsTab
            clientUuid={uuid}
            contacts={client.contacts}
            canEdit={canEdit}
            onRefresh={fetchClient}
          />
        )}

        {tab === "Credentials" && (
          <CredentialsTab
            uuid={uuid}
            credentials={client.credentials}
            canEdit={canCreds}
            onRefresh={fetchClient}
          />
        )}

        {tab === "Documents" && (
          <DocumentsTab
            uuid={uuid}
            documents={client.documents}
            canEdit={canEdit}
            onRefresh={fetchClient}
          />
        )}

        {tab === "Payments" && (
          <PaymentsTab clientId={client.id} />
        )}

        {/* Tasks tab — each task is a clickable link */}
        {tab === "Tasks" && (
          <div className="space-y-2">
            {client.tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No tasks linked to this client.</p>
            ) : client.tasks.map(task => (
              <Link
                key={task.id}
                href={`/tasks?highlight=${task.uuid}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">{task.title}</p>
                  {task.assignedTo && <p className="text-xs text-slate-400">Assigned to {task.assignedTo.name}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "No due date"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                    task.status === "DONE"        ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    task.status === "IN_REVIEW"   ? "bg-violet-50 text-violet-700 border-violet-200" :
                    "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "Activity" && <ActivityTab clientUuid={uuid} />}
      </div>

      {/* Edit Modal */}
      <ClientModal client={client} open={editOpen} onClose={() => setEditOpen(false)} onSaved={fetchClient} />

      {/* Tracking Dialog */}
      <TrackingDialog
        open={trackOpen}
        onClose={() => setTrackOpen(false)}
        onSaved={fetchClient}
        clientUuid={uuid}
        initial={{
          nextFollowup:    client.nextFollowup,
          meetingDatetime: client.meetingDatetime,
        }}
      />
    </div>
  );
}
