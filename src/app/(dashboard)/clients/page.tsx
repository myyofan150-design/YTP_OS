"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ClientModal } from "@/components/modules/clients/ClientModal";
import { StatusBadge } from "@/components/modules/clients/StatusBadge";
import { ContractBadge } from "@/components/modules/clients/ContractBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Pencil, Trash2, Phone, Globe } from "lucide-react";
import { resolveAssetUrl } from "@/lib/utils";
import type { Client, ApiResponse } from "@/types";

const CAN_CREATE   = ["SUPER_ADMIN", "ADMIN"];
const CAN_DELETE   = ["SUPER_ADMIN"];

const TAG_STYLES: Record<string, string> = {
  VIP:        "bg-purple-50 text-purple-700 border-purple-200",
  Risk:       "bg-red-50 text-red-700 border-red-200",
  "Long-term": "bg-teal-50 text-teal-700 border-teal-200",
};

// Official WhatsApp SVG icon
function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function StatCard({ label, value, sub, index = 0 }: { label: string; value: string | number; sub?: string; index?: number }) {
  return (
    <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function RenewalChip({ days }: { days: number | null | undefined }) {
  if (days == null) return <span className="text-muted-foreground/50 text-xs">—</span>;
  if (days < 0)   return <span className="text-xs text-red-500 font-medium">Expired</span>;
  if (days <= 7)  return <span className="text-xs text-red-500 font-semibold">{days}d left</span>;
  if (days <= 30) return <span className="text-xs text-amber-500 font-medium">{days}d left</span>;
  return <span className="text-xs text-muted-foreground">{days}d left</span>;
}

function TagBadge({ tag }: { tag?: string | null }) {
  if (!tag) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TAG_STYLES[tag] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {tag}
    </span>
  );
}

function ClientLogo({ name, url }: { name: string; url?: string | null }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolveAssetUrl(url);
  if (src && !imgErr) return (
    <img src={src} alt={name} onError={() => setImgErr(true)}
      className="w-7 h-7 rounded-md object-cover shrink-0 border border-border" />
  );
  return (
    <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function fmtCrore(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function ClientsPage() {
  const { user } = useAuthStore();
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const canCreate = CAN_CREATE.includes(user?.role ?? "");
  const canDelete = CAN_DELETE.includes(user?.role ?? "");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params["search"] = search;
      if (statusFilter !== "ALL") params["status"] = statusFilter;
      const res = await api.get<ApiResponse<Client[]>>("/clients", { params });
      setClients(res.data.data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchClients, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchClients, search]);

  const active   = clients.filter(c => c.status === "ACTIVE");
  const tcv      = active.reduce((s, c) => s + (c.totalContractValue ?? 0), 0);
  const renewals = clients.filter(c => (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0).length;

  async function handleDelete(c: Client) {
    if (!confirm(`Delete "${c.companyName}"? This will mark them as churned.`)) return;
    try {
      await api.delete(`/clients/${c.uuid}`);
      fetchClients();
    } catch {
      alert("Failed to delete client.");
    }
  }

  function openAdd()        { setEditClient(null);  setModalOpen(true); }
  function openEdit(c: Client) { setEditClient(c);  setModalOpen(true); }

  function formatDate(s?: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your agency&apos;s client portfolio</p>
        </div>
        {canCreate && (
          <Button onClick={openAdd} className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground">
            + Add Client
          </Button>
        )}
      </div>

      {/* Stat Cards — Monthly Revenue removed */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard index={0} label="Total Clients"       value={clients.length} />
        <StatCard index={1} label="Active"              value={active.length} sub={`${clients.length - active.length} others`} />
        <StatCard index={2} label="Total Contract Value" value={tcv > 0 ? fmtCrore(tcv) : "—"} sub="Active clients" />
        <StatCard index={3} label="Renewals Due"        value={renewals} sub="Within 30 days" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 animate-fade-in delay-200">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 max-w-xs text-sm"
        />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-48 text-sm">
            <span className="text-muted-foreground mr-1">Status:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="PROSPECT">Prospect</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="CHURNED">Churned</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("ALL"); }} className="text-xs text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-300 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Renewal</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No clients found.</td></tr>
              ) : clients.map(c => {
                const renewingSoon = (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0;
                return (
                  <tr key={c.uuid} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${renewingSoon ? "bg-amber-500/5" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ClientLogo name={c.companyName} url={c.logoUrl} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/clients/${c.uuid}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                            {c.companyName}
                          </Link>
                          <TagBadge tag={c.clientTag} />
                        </div>
                      </div>
                      {c.assignedToName && (
                        <p className="text-xs text-muted-foreground mt-0.5">Assigned: {c.assignedToName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{c.contactPerson}</p>
                    </td>
                    {/* Email as mailto link */}
                    <td className="px-4 py-3">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const svcs: string[] = Array.isArray(c.services)
                          ? c.services
                          : typeof c.services === "string"
                            ? (() => { try { const p = JSON.parse(c.services as unknown as string); return Array.isArray(p) ? p : []; } catch { return []; } })()
                            : [];
                        return svcs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {svcs.map((svc, i) => (
                              <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {svc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><ContractBadge type={c.contractType} /></td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{formatDate(c.contractEnd)}</p>
                        <RenewalChip days={c.daysUntilRenewal} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.activeTasks != null && c.activeTasks > 0 ? (
                        <Link href={`/tasks?clientId=${c.id}`} className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold w-6 h-6 hover:bg-primary/20 transition-colors">
                          {c.activeTasks}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    {/* Actions column — icon buttons only, no text labels */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Phone icon — only if phone is available */}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} title={c.phone}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Phone size={13} />
                          </a>
                        )}
                        {/* Globe icon — only if website is available */}
                        {c.website && (
                          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                            target="_blank" rel="noopener noreferrer" title={c.website}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Globe size={13} />
                          </a>
                        )}
                        {/* WhatsApp official branded icon — only if whatsapp is available */}
                        {c.whatsapp && (
                          <a
                            href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`WhatsApp ${c.whatsapp}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#25D366]/10 transition-colors"
                          >
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                        {/* View */}
                        <Link href={`/clients/${c.uuid}`} title="View client"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Eye size={13} />
                        </Link>
                        {/* Edit */}
                        {canCreate && (
                          <button onClick={() => openEdit(c)} title="Edit client"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        {/* Delete */}
                        {canDelete && (
                          <button onClick={() => handleDelete(c)} title="Delete client"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal client={editClient} open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchClients} />
    </div>
  );
}
