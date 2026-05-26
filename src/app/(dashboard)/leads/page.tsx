"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Settings, Search, LayoutGrid, List, Download,
  RefreshCw, Filter, X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLeadMeta, useLeads, useLeadStats } from "@/hooks/useLeads";
import { LeadCard }               from "@/components/modules/leads/LeadCard";
import { LeadKanbanBoard }         from "@/components/modules/leads/LeadKanbanBoard";
import { LeadFormDialog }          from "@/components/modules/leads/LeadFormDialog";
import { LeadDetailDialog }        from "@/components/modules/leads/LeadDetailDialog";
import { ConvertLeadDialog }       from "@/components/modules/leads/ConvertLeadDialog";
import { LeadMetaManagerDialog }   from "@/components/modules/leads/LeadMetaManagerDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

// ─── LeadsPage ────────────────────────────────────────────────────────────────

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
  const [convertedFilter, setConvertedFilter] = useState("");

  // ── View ──
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // ── Data ──
  const [page, setPage] = useState(1);
  const LIMIT = 30;

  const { leads, total, loading, refetch: refetchLeads } = useLeads({
    search:     debouncedSearch || undefined,
    statusId:   statusFilter   ? Number(statusFilter)   : null,
    priorityId: priorityFilter ? Number(priorityFilter) : null,
    sourceId:   sourceFilter   ? Number(sourceFilter)   : null,
    converted:  convertedFilter === "1" ? true : convertedFilter === "0" ? false : null,
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
    setSearch(""); setDebouncedSearch(""); setStatusFilter("");
    setPriorityFilter(""); setSourceFilter(""); setConvertedFilter(""); setPage(1);
  }

  const hasFilters = !!(debouncedSearch || statusFilter || priorityFilter || sourceFilter || convertedFilter);

  function refetchAll() { refetchLeads(); refetchStats(); }

  // ── CSV Export ──
  async function handleExport() {
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params["search"]     = debouncedSearch;
      if (statusFilter)    params["statusId"]   = statusFilter;
      if (priorityFilter)  params["priorityId"] = priorityFilter;
      if (sourceFilter)    params["sourceId"]   = sourceFilter;
      if (convertedFilter) params["converted"]  = convertedFilter;
      const qs = new URLSearchParams(params).toString();
      const url = `/api/leads/export/csv${qs ? "?" + qs : ""}`;
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
  const [metaOpen,       setMetaOpen]       = useState(false);
  const [formOpen,       setFormOpen]       = useState(false);
  const [editingUuid,    setEditingUuid]    = useState<string | null>(null);
  const [detailUuid,     setDetailUuid]     = useState<string | null>(null);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [convertLead,    setConvertLead]    = useState<Lead | null>(null);
  const [convertOpen,    setConvertOpen]    = useState(false);

  function openDetail(lead: Lead) {
    setDetailUuid(lead.uuid); setDetailOpen(true);
  }

  function openEdit(uuid: string) {
    setEditingUuid(uuid); setDetailOpen(false); setFormOpen(true);
  }

  function openConvert(lead: Lead) {
    setConvertLead(lead); setDetailOpen(false); setConvertOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Leads"    value={stats.total} />
          <StatCard label="Converted"      value={stats.convertedCount} color="#22C55E" />
          <StatCard label="Lost"           value={stats.lostCount}      color="#EF4444" />
          <StatCard label="Follow-up Today" value={stats.followupToday}  color="#F59E0B" />
          <StatCard label="Meetings Today"  value={stats.meetingsToday}  color="#6366F1" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-36"><span className="text-muted-foreground mr-1 shrink-0">Status:</span><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {meta.statuses.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />{s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-36"><span className="text-muted-foreground mr-1 shrink-0">Priority:</span><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {meta.priorities.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.color }} />{p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-36"><span className="text-muted-foreground mr-1 shrink-0">Source:</span><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {meta.sources.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />{s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={convertedFilter} onValueChange={v => { setConvertedFilter(v ?? ""); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-40"><span className="text-muted-foreground mr-1 shrink-0">Converted:</span><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="1">Yes</SelectItem>
              <SelectItem value="0">No</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 h-8 px-2 rounded-md text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <X size={12} />Clear
            </button>
          )}
        </div>

        {/* Right: View toggle + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button onClick={() => setView("kanban")} className="flex h-8 w-8 items-center justify-center transition-colors"
              style={view === "kanban" ? { background: "var(--accent)", color: "#000" } : { color: "var(--text-secondary)" }}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView("list")} className="flex h-8 w-8 items-center justify-center transition-colors"
              style={view === "list" ? { background: "var(--accent)", color: "#000" } : { color: "var(--text-secondary)" }}>
              <List size={14} />
            </button>
          </div>

          {isAdmin && (
            <button onClick={handleExport} title="Export CSV"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <Download size={14} />
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setMetaOpen(true)} title="Manage Lead Meta"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
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
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="h-7 px-2 rounded text-xs transition-opacity disabled:opacity-40 hover:opacity-70"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              ← Prev
            </button>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Page {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}
              className="h-7 px-2 rounded text-xs transition-opacity disabled:opacity-40 hover:opacity-70"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
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
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[240px] w-[240px] shrink-0 space-y-2">
                <Skeleton className="h-5 w-24" />
                <div className="rounded-xl p-2 space-y-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {Array.from({ length: 3 }).map((_, j) => <LeadSkeleton key={j} />)}
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
        <LeadKanbanBoard
          leads={localLeads}
          statuses={meta.statuses}
          onLeadClick={openDetail}
          onLeadsChange={setLocalLeads}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
    </div>
  );
}
