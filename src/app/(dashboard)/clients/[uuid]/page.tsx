"use client";

// src/app/(dashboard)/clients/[uuid]/page.tsx
// Client detail page with 4 tabs: Overview, Credentials, Documents, Tasks.

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ClientModal } from "@/components/modules/clients/ClientModal";
import { CredentialsTab } from "@/components/modules/clients/CredentialsTab";
import { DocumentsTab } from "@/components/modules/clients/DocumentsTab";
import { StatusBadge } from "@/components/modules/clients/StatusBadge";
import { ContractBadge } from "@/components/modules/clients/ContractBadge";
import { Button } from "@/components/ui/button";
import type { ClientDetail, ApiResponse } from "@/types";

const TABS = ["Overview", "Credentials", "Documents", "Tasks"] as const;
type Tab = typeof TABS[number];

const CAN_EDIT = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD"];
const CAN_CREDS = ["SUPER_ADMIN", "ADMIN"];

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
      {days < 0
        ? "Contract has expired."
        : days === 0
        ? "Contract expires today!"
        : `Contract expires in ${days} day${days === 1 ? "" : "s"}.`}
    </div>
  );
}

export default function ClientDetailPage() {
  const { uuid } = useParams() as { uuid: string };
  const router = useRouter();
  const { user } = useAuthStore();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);

  const canEdit  = CAN_EDIT.includes(user?.role ?? "");
  const canCreds = CAN_CREDS.includes(user?.role ?? "");

  const fetchClient = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<ClientDetail>>(`/clients/${uuid}`);
      setClient(res.data.data);
    } catch {
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  function formatDate(s?: string | null) {
    if (!s) return null;
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading client…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-slate-500">Client not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ← Clients
            </button>
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-800">{client.companyName}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={client.status} />
            <ContractBadge type={client.contractType} />
          </div>
        </div>
        {canEdit && (
          <Button
            onClick={() => setEditOpen(true)}
            className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white shrink-0"
          >
            Edit Client
          </Button>
        )}
      </div>

      <RenewalAlert days={client.daysUntilRenewal} />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
              {t === "Credentials" && client.credentials.length > 0 && (
                <span className="ml-1.5 text-xs text-slate-400">({client.credentials.length})</span>
              )}
              {t === "Documents" && client.documents.length > 0 && (
                <span className="ml-1.5 text-xs text-slate-400">({client.documents.length})</span>
              )}
              {t === "Tasks" && client.tasks.length > 0 && (
                <span className="ml-1.5 text-xs text-slate-400">({client.tasks.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tab === "Overview" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Person" value={client.contactPerson} />
                <Field label="Email" value={client.email} />
                <Field label="Phone" value={client.phone} />
                <Field label="GST Number" value={client.gstNumber} />
              </div>
              <Field label="Address" value={client.address} />
            </div>

            {/* Contract Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Contract Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Monthly Fee"
                  value={client.monthlyFee != null ? `₹${client.monthlyFee.toLocaleString("en-IN")}` : null}
                />
                <Field
                  label="Days Until Renewal"
                  value={client.daysUntilRenewal != null ? `${client.daysUntilRenewal} days` : null}
                />
                <Field label="Contract Start" value={formatDate(client.contractStart)} />
                <Field label="Contract End"   value={formatDate(client.contractEnd)} />
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

            {/* Services */}
            {Array.isArray(client.services) && client.services.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Services</h2>
                <div className="flex flex-wrap gap-2">
                  {client.services.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Notes</h2>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
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

        {tab === "Tasks" && (
          <div className="space-y-2">
            {client.tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No tasks linked to this client.</p>
            ) : (
              client.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    {task.assignedTo && (
                      <p className="text-xs text-slate-400">Assigned to {task.assignedTo.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                        : "No due date"}
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
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ClientModal
        client={client}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={fetchClient}
      />
    </div>
  );
}
