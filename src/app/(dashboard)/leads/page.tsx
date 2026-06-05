"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Settings, Search, LayoutGrid, List, Download, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLeadMeta, useLeads, useLeadStats } from "@/hooks/useLeads";
import { LeadCard }             from "@/components/modules/leads/LeadCard";
import { LeadKanbanBoard }      from "@/components/modules/leads/LeadKanbanBoard";
import { LeadFormDialog }       from "@/components/modules/leads/LeadFormDialog";
import { LeadDetailDialog }     from "@/components/modules/leads/LeadDetailDialog";
import { ConvertLeadDialog }    from "@/components/modules/leads/ConvertLeadDialog";
import { LeadMetaManagerDialog } from "@/components/modules/leads/LeadMetaManagerDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Lead } from "@/types";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LeadSkeleton() {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-1.5"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

// ─── ImportLeadDialog ─────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = [
  "contactPerson", "companyName", "email", "phone", "whatsapp",
  "status", "priority", "source", "services",
  "budgetMin", "budgetMax", "timeline",
  "nextFollowup", "notes",
].join(",");

const CSV_TEMPLATE_EXAMPLE = [
  "John Smith", "Acme Corp", "john@acme.com", "+91-9876543210", "+91-9876543210",
  "New", "High", "Website", "SEO;Social Media",
  "50000", "100000", "2024-06-30",
  "2024-05-15", "Follow up after demo",
].join(",");

function ImportLeadDialog({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile]       = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState<{ imported: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setFile(null); setError(""); setResult(null); }
  }, [open]);

  function handleDownloadTemplate() {
    const csv = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_EXAMPLE}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport() {
    if (!file) { setError("Please select a CSV file"); return; }
    setSaving(true); setError(""); setResult(null);
    try {
      const text = await file.text();
      const res = await api.post<{ data: { imported: number; skipped: number } }>(
        "/leads/import/csv",
        text,
        { headers: { "Content-Type": "text/csv" } }
      );
      setResult(res.data.data);
      toast.success(`Imported ${res.data.data.imported} lead${res.data.data.imported !== 1 ? "s" : ""}`);
      onImported();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Import failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} />Import Leads from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to import leads in bulk. Download the template to see the required column format.
            Use semicolons to separate multiple services (e.g. <code className="text-xs bg-muted px-1 rounded">SEO;PPC</code>).
          </p>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <Download size={12} />Download CSV Template
          </button>

          <div className="space-y-1.5">
            <Label className="text-xs">CSV File</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] ?? null); setError(""); setResult(null); }}
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/30"
              style={{ borderColor: "var(--border)", minHeight: "36px" }}
            >
              <Upload size={13} style={{ color: "var(--text-secondary)" }} />
              <span className="text-sm truncate" style={{ color: file ? "var(--text-primary)" : "var(--text-secondary)" }}>
                {file ? file.name : "Choose file…"}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs rounded px-2 py-1.5" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              {error}
            </p>
          )}

          {result && (
            <p className="text-xs rounded px-2 py-1.5" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
              Imported {result.imported} lead{result.imported !== 1 ? "s" : ""}.
              {result.skipped > 0 ? ` ${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped (missing contact person).` : ""}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button size="sm" onClick={handleImport} disabled={saving || !file}>
                {saving ? "Importing…" : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
// Renders label text directly in trigger to avoid shadcn SelectValue JSX rendering issues.

interface FilterOption { id: number | string; label: string; color?: string }

function FilterSelect({
  label, value, options, placeholder = "All", width = "w-36",
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  placeholder?: string;
  width?: string;
  onChange: (v: string) => void;
}) {
  const selected = options.find(o => String(o.id) === value);

  return (
    <Select value={value} onValueChange={v => onChange(v ?? "")}>
      <SelectTrigger className={`h-8 text-xs ${width}`}>
        <span className="flex items-center gap-1.5 truncate min-w-0">
          <span className="text-muted-foreground shrink-0">{label}:</span>
          {selected?.color && (
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: selected.color }} />
          )}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={String(o.id)} value={String(o.id)}>
            <span className="flex items-center gap-1.5">
              {o.color && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.color }} />}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── LeadsPage ────────────────────────────────────────────────────────────────

const FOLLOWUP_OPTIONS: FilterOption[] = [
  { id: "today",   label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "week",    label: "This Week" },
];

export default function LeadsPage() {
  const { user: authUser } = useAuthStore();
  const isAdmin = authUser?.role === "SUPER_ADMIN" || authUser?.role === "ADMIN";

  // ── Meta + Stats ──
  const meta = useLeadMeta();
  const { stats, refetch: refetchStats } = useLeadStats();

  // ── Filter state ──
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,    setStatusFilter]    = useState("");
  const [priorityFilter,  setPriorityFilter]  = useState("");
  const [sourceFilter,    setSourceFilter]    = useState("");
  const [serviceFilter,   setServiceFilter]   = useState("");
  const [followupFilter,  setFollowupFilter]  = useState("");
  const [convertedFilter, setConvertedFilter] = useState("");

  // ── View ──
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // ── Data ──
  const [page, setPage] = useState(1);
  const LIMIT = 30;

  const { leads, total, loading, refetch: refetchLeads } = useLeads({
    search:     debouncedSearch || undefined,
    statusId:   statusFilter    ? Number(statusFilter)   : null,
    priorityId: priorityFilter  ? Number(priorityFilter) : null,
    sourceId:   sourceFilter    ? Number(sourceFilter)   : null,
    serviceId:  serviceFilter   ? Number(serviceFilter)  : null,
    converted:  convertedFilter === "1" ? true : convertedFilter === "0" ? false : null,
    followup:   (followupFilter as "today" | "overdue" | "week") || null,
    page,
    limit: LIMIT,
  });

  const [localLeads, setLocalLeads] = useState<Lead[]>([]);
  useEffect(() => { setLocalLeads(leads); }, [leads]);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 350);
  }

  function clearFilters() {
    setSearch(""); setDebouncedSearch("");
    setStatusFilter(""); setPriorityFilter(""); setSourceFilter("");
    setServiceFilter(""); setFollowupFilter(""); setConvertedFilter("");
    setPage(1);
  }

  const hasFilters = !!(
    debouncedSearch || statusFilter || priorityFilter || sourceFilter ||
    serviceFilter || followupFilter || convertedFilter
  );

  function refetchAll() { refetchLeads(); refetchStats(); }

  // ── CSV Export ──
  async function handleExport() {
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params["search"]     = debouncedSearch;
      if (statusFilter)    params["statusId"]   = statusFilter;
      if (priorityFilter)  params["priorityId"] = priorityFilter;
      if (sourceFilter)    params["sourceId"]   = sourceFilter;
      if (serviceFilter)   params["serviceId"]  = serviceFilter;
      if (followupFilter)  params["followup"]   = followupFilter;
      if (convertedFilter) params["converted"]  = convertedFilter;
      const qs = new URLSearchParams(params).toString();
      const url = `/leads/export/csv${qs ? "?" + qs : ""}`;
      const res = await api.get(url, { responseType: "blob" });
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Export failed");
    }
  }

  // ── Dialog state ──
  const [metaOpen,    setMetaOpen]    = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [detailUuid,  setDetailUuid]  = useState<string | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  function openDetail(lead: Lead) { setDetailUuid(lead.uuid); setDetailOpen(true); }
  function openEdit(uuid: string) { setEditingUuid(uuid); setDetailOpen(false); setFormOpen(true); }
  function openConvert(lead: Lead) { setConvertLead(lead); setDetailOpen(false); setConvertOpen(true); }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-up">
          <StatCard label="Total Leads"     value={stats.total} />
          <StatCard label="Converted"       value={stats.convertedCount} color="#22C55E" />
          <StatCard label="Lost"            value={stats.lostCount}      color="#EF4444" />
          <StatCard label="Follow-up Today" value={stats.followupToday}  color="#F59E0B" />
          <StatCard label="Meetings Today"  value={stats.meetingsToday}  color="#6366F1" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between animate-fade-in delay-100">
        {/* Left: Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--text-secondary)" }} />
            <Input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search leads…"
              className="h-8 pl-8 text-sm w-48"
            />
          </div>

          <FilterSelect
            label="Status"
            value={statusFilter}
            options={meta.statuses.map(s => ({ id: s.id, label: s.label, color: s.color }))}
            onChange={v => { setStatusFilter(v); setPage(1); }}
          />

          <FilterSelect
            label="Priority"
            value={priorityFilter}
            options={meta.priorities.map(p => ({ id: p.id, label: p.label, color: p.color }))}
            onChange={v => { setPriorityFilter(v); setPage(1); }}
          />

          <FilterSelect
            label="Source"
            value={sourceFilter}
            options={meta.sources.map(s => ({ id: s.id, label: s.label, color: s.color }))}
            onChange={v => { setSourceFilter(v); setPage(1); }}
          />

          <FilterSelect
            label="Service"
            value={serviceFilter}
            options={meta.services.map(s => ({ id: s.id, label: s.label, color: s.color }))}
            onChange={v => { setServiceFilter(v); setPage(1); }}
          />

          <FilterSelect
            label="Follow-up"
            value={followupFilter}
            options={FOLLOWUP_OPTIONS}
            placeholder="Any"
            width="w-36"
            onChange={v => { setFollowupFilter(v); setPage(1); }}
          />

          <FilterSelect
            label="Converted"
            value={convertedFilter}
            options={[{ id: "1", label: "Yes" }, { id: "0", label: "No" }]}
            width="w-36"
            onChange={v => { setConvertedFilter(v); setPage(1); }}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 h-8 px-2 rounded-md text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <X size={12} />Clear
            </button>
          )}
        </div>

        {/* Right: View toggle + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => setView("kanban")}
              className="flex h-8 w-8 items-center justify-center transition-colors"
              style={view === "kanban" ? { background: "var(--accent)", color: "#000" } : { color: "var(--text-secondary)" }}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className="flex h-8 w-8 items-center justify-center transition-colors"
              style={view === "list" ? { background: "var(--accent)", color: "#000" } : { color: "var(--text-secondary)" }}
            >
              <List size={14} />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={handleExport}
              title="Export CSV"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <Download size={14} />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setImportOpen(true)}
              title="Import CSV"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <Upload size={14} />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setMetaOpen(true)}
              title="Manage Lead Meta"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <Settings size={14} />
            </button>
          )}

          <Button size="sm" onClick={() => { setEditingUuid(null); setFormOpen(true); }} className="h-8 gap-1.5 text-xs">
            <Plus size={14} />New Lead
          </Button>
        </div>
      </div>

      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {loading ? "Loading…" : `${total} lead${total !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`}
        </p>
        {view === "list" && total > LIMIT && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="h-7 px-2 rounded text-xs transition-opacity disabled:opacity-40 hover:opacity-70"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              ← Prev
            </button>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Page {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage(p => p + 1)}
              className="h-7 px-2 rounded text-xs transition-opacity disabled:opacity-40 hover:opacity-70"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      {loading ? (
        view === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <LeadSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <div className="rounded-xl p-2 flex gap-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {Array.from({ length: 3 }).map((_, j) => <div key={j} className="w-[220px] shrink-0"><LeadSkeleton /></div>)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {hasFilters ? "No leads match your filters" : "No leads yet"}
          </p>
          {!hasFilters && (
            <Button size="sm" onClick={() => { setEditingUuid(null); setFormOpen(true); }} className="gap-1.5">
              <Plus size={14} />Add First Lead
            </Button>
          )}
        </div>
      ) : view === "kanban" ? (
        <div className="animate-fade-up delay-200">
          <LeadKanbanBoard
            leads={localLeads}
            statuses={meta.statuses}
            onLeadClick={openDetail}
            onLeadsChange={setLocalLeads}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-up delay-200">
          {localLeads.map(lead => (
            <LeadCard key={lead.uuid} lead={lead} onClick={() => openDetail(lead)} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <LeadMetaManagerDialog
        open={metaOpen}
        onClose={() => { setMetaOpen(false); meta.refetch(); }}
      />

      <LeadFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingUuid(null); }}
        onSaved={refetchAll}
        editUuid={editingUuid}
        meta={meta}
      />

      <LeadDetailDialog
        open={detailOpen}
        uuid={detailUuid}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
        onConvert={openConvert}
        onDeleted={refetchAll}
        onChanged={refetchAll}
      />

      <ConvertLeadDialog
        open={convertOpen}
        lead={convertLead}
        onClose={() => setConvertOpen(false)}
        onConverted={refetchAll}
      />

      <ImportLeadDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refetchAll}
      />
    </div>
  );
}
