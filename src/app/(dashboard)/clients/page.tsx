"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ClientModal } from "@/components/modules/clients/ClientModal";
import { StatusBadge } from "@/components/modules/clients/StatusBadge";
import { ContractBadge } from "@/components/modules/clients/ContractBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { Pencil, Trash2, Phone, Globe, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { resolveAssetUrl } from "@/lib/utils";
import type { Client, ApiResponse } from "@/types";

const CAN_CREATE = ["SUPER_ADMIN", "ADMIN"];
const CAN_DELETE = ["SUPER_ADMIN"];

const TAG_STYLES: Record<string, string> = {
  VIP:          "bg-purple-50 text-purple-700 border-purple-200",
  Risk:         "bg-red-50 text-red-700 border-red-200",
  "Long-term":  "bg-teal-50 text-teal-700 border-teal-200",
};

const STATUS_OPTS = [
  { value: "ACTIVE",    label: "Active" },
  { value: "INACTIVE",  label: "Inactive" },
  { value: "ON_HOLD",   label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CHURNED",   label: "Churned" },
];

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
  if (days < 0)    return <span className="text-xs text-red-500 font-medium">Expired</span>;
  if (days <= 7)   return <span className="text-xs text-red-500 font-semibold">{days}d left</span>;
  if (days <= 30)  return <span className="text-xs text-amber-500 font-medium">{days}d left</span>;
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

function ClientLogo({ name, url }: { name: string | null; url?: string | null }) {
  const [imgErr, setImgErr] = useState(false);
  const src = resolveAssetUrl(url);
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  if (src && !imgErr) return (
    <img src={src} alt={name ?? ""} onError={() => setImgErr(true)}
      className="w-7 h-7 rounded-md object-cover shrink-0 border border-border" />
  );
  return (
    <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
      {initials}
    </div>
  );
}

function fmtCrore(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

// Inline filter select that shows label text in trigger (avoids shadcn SelectValue JSX issues)
function FilterSelect({
  label, value, options, placeholder = "All", width = "w-40",
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  width?: string;
  onChange: (v: string) => void;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <Select value={value} onValueChange={v => onChange(v ?? "")}>
      <SelectTrigger className={`h-9 text-sm ${width}`}>
        <span className="flex items-center gap-1 truncate min-w-0">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface MetaOption { id: number; uuid: string; label: string; color: string; }

export default function ClientsPage() {
  const { user } = useAuthStore();
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]       = useState("");
  const [serviceFilter, setServiceFilter]     = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState("");
  const [outstandingFilter, setOutstandingFilter]   = useState(false);
  const [taskSort, setTaskSort]       = useState<"" | "asc" | "desc">("");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editClient, setEditClient]   = useState<Client | null>(null);
  // Pending hard-delete: uuid + timer id (delete fires after 10s if not undone)
  const [pendingDelete, setPendingDelete] = useState<{ client: Client; timerId: ReturnType<typeof setTimeout> } | null>(null);

  // Meta for filter dropdowns
  const [serviceOptions, setServiceOptions]       = useState<MetaOption[]>([]);
  const [contractTypeOptions, setContractTypeOptions] = useState<MetaOption[]>([]);

  const canCreate = CAN_CREATE.includes(user?.role ?? "");
  const canDelete = CAN_DELETE.includes(user?.role ?? "");

  // Load meta options for filters
  useEffect(() => {
    api.get<{ data: { services: MetaOption[]; contractTypes: MetaOption[] } }>("/clients/meta")
      .then(res => {
        setServiceOptions(res.data.data.services ?? []);
        setContractTypeOptions(res.data.data.contractTypes ?? []);
      })
      .catch(() => {});
  }, []);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(v), 350);
  }

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch)    params["search"]       = debouncedSearch;
      if (statusFilter)       params["status"]       = statusFilter;
      if (serviceFilter)      params["service"]      = serviceFilter;
      if (contractTypeFilter) params["contractType"] = contractTypeFilter;
      if (outstandingFilter)  params["outstanding"]  = "1";
      if (taskSort)           params["taskSort"]     = taskSort;
      const res = await api.get<ApiResponse<Client[]>>("/clients", { params });
      setClients(res.data.data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, serviceFilter, contractTypeFilter, outstandingFilter, taskSort]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Stat computations
  const active   = clients.filter(c => c.status === "ACTIVE");
  const tcv      = clients.reduce((s, c) => s + (c.totalContractValue ?? 0), 0);
  const renewals = clients.filter(c => (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0).length;
  const totalCollected = clients.reduce((s, c) => s + (c.totalPaid ?? 0), 0);

  const hasFilters = !!(debouncedSearch || statusFilter || serviceFilter || contractTypeFilter || outstandingFilter || taskSort);

  function clearFilters() {
    setSearch(""); setDebouncedSearch(""); setStatusFilter("");
    setServiceFilter(""); setContractTypeFilter(""); setOutstandingFilter(false); setTaskSort("");
  }

  // Hard delete with 10-second undo window
  function handleHardDelete(c: Client) {
    const displayName = c.companyName ?? c.contactPerson;
    if (!confirm(`Permanently delete "${displayName}"?\n\nThis will delete ALL linked data including contacts, payments, documents, tasks, and credentials across every module. You have 10 seconds to undo.`)) return;

    // Cancel any existing pending delete
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId);
      setPendingDelete(null);
    }

    // Optimistic remove
    setClients(prev => prev.filter(x => x.uuid !== c.uuid));

    const timerId = setTimeout(async () => {
      try {
        await api.delete(`/clients/${c.uuid}/hard`);
      } catch {
        setClients(prev => [...prev, c].sort((a, b) => (a.companyName ?? "").localeCompare(b.companyName ?? "")));
        toast.error("Failed to permanently delete client.");
      }
      setPendingDelete(null);
    }, 10000);

    setPendingDelete({ client: c, timerId });

    toast(`"${displayName}" will be permanently deleted`, {
      description: "All linked data will be erased. Click Undo within 10 seconds to cancel.",
      duration: 10000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timerId);
          setPendingDelete(null);
          setClients(prev => [...prev, c].sort((a, b) => (a.companyName ?? "").localeCompare(b.companyName ?? "")));
          toast.success("Delete cancelled — client restored.");
        },
      },
    });
  }

  function openAdd()           { setEditClient(null); setModalOpen(true); }
  function openEdit(c: Client) { setEditClient(c);    setModalOpen(true); }

  function formatDate(s?: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function cycleTaskSort() {
    setTaskSort(prev => prev === "" ? "desc" : prev === "desc" ? "asc" : "");
  }

  const TaskSortIcon = taskSort === "desc" ? ArrowDown : taskSort === "asc" ? ArrowUp : ArrowUpDown;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard index={0} label="Total Clients"        value={clients.length} />
        <StatCard index={1} label="Active"               value={active.length} sub={`${clients.length - active.length} others`} />
        <StatCard index={2} label="Total Contract Value" value={tcv > 0 ? fmtCrore(tcv) : "—"} sub="All statuses" />
        <StatCard index={3} label="Renewals Due"         value={renewals} sub="Within 30 days" />
        <StatCard index={4} label="Total Collected"      value={fmtCrore(totalCollected)} sub="Paid invoices" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in delay-200">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="h-9 w-56 text-sm"
        />

        <FilterSelect
          label="Status"
          value={statusFilter}
          options={STATUS_OPTS}
          onChange={setStatusFilter}
          width="w-40"
        />

        <FilterSelect
          label="Service"
          value={serviceFilter}
          options={serviceOptions.map(s => ({ value: s.label, label: s.label }))}
          onChange={setServiceFilter}
          width="w-40"
        />

        <FilterSelect
          label="Contract"
          value={contractTypeFilter}
          options={contractTypeOptions.map(ct => ({ value: ct.label, label: ct.label }))}
          onChange={setContractTypeFilter}
          width="w-40"
        />

        <button
          onClick={() => setOutstandingFilter(v => !v)}
          className={`h-9 px-3 rounded-lg text-sm font-medium transition-colors border ${
            outstandingFilter
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40"
          }`}
        >
          Outstanding
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity"
          >
            <X size={13} />Clear
          </button>
        )}

        {canCreate && (
          <Button onClick={openAdd} className="ml-auto h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground">
            + Add Client
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Renewal</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={cycleTaskSort}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    title={taskSort === "" ? "Sort tasks descending" : taskSort === "desc" ? "Sort tasks ascending" : "Clear task sort"}
                  >
                    Tasks <TaskSortIcon size={11} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No clients found.</td></tr>
              ) : clients.map(c => {
                const renewingSoon = (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0;
                const displayName  = c.companyName ?? c.contactPerson;
                return (
                  <tr key={c.uuid} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${renewingSoon ? "bg-amber-500/5" : ""}`}>
                    {/* Company */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ClientLogo name={c.companyName} url={c.logoUrl} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/clients/${c.uuid}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                              {displayName}
                            </Link>
                            <TagBadge tag={c.clientTag} />
                          </div>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="text-[11px] text-muted-foreground hover:text-primary hover:underline truncate max-w-[200px] block transition-colors">
                              {c.email}
                            </a>
                          ) : (
                            <p className="text-[11px] text-muted-foreground/50">—</p>
                          )}
                          {c.assignedToName && (
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Assigned: {c.assignedToName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-foreground">{c.contactPerson}</p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    {/* Contract */}
                    <td className="px-4 py-3"><ContractBadge type={c.contractType} /></td>
                    {/* Renewal */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{formatDate(c.contractEnd)}</p>
                        <RenewalChip days={c.daysUntilRenewal} />
                      </div>
                    </td>
                    {/* Tasks */}
                    <td className="px-4 py-3 text-center">
                      {c.activeTasks != null && c.activeTasks > 0 ? (
                        <Link href={`/tasks?clientId=${c.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold w-6 h-6 hover:bg-primary/20 transition-colors">
                          {c.activeTasks}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} title={c.phone}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Phone size={13} />
                          </a>
                        )}
                        {c.website && (
                          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                            target="_blank" rel="noopener noreferrer" title={c.website}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Globe size={13} />
                          </a>
                        )}
                        {c.whatsapp && (
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            title={`WhatsApp ${c.whatsapp}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#25D366]/10 transition-colors">
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                        {canCreate && (
                          <button onClick={() => openEdit(c)} title="Edit client"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleHardDelete(c)} title="Permanently delete client"
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
