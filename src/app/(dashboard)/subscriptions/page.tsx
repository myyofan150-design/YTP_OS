"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Settings, Search, LayoutGrid, CalendarDays, Download, FileText, Table, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSubscriptionMeta } from "@/hooks/useSubscriptions";
import { SubscriptionCard } from "@/components/modules/subscriptions/SubscriptionCard";
import { SubscriptionCalendar } from "@/components/modules/subscriptions/SubscriptionCalendar";
import { SubscriptionAnalytics } from "@/components/modules/subscriptions/SubscriptionAnalytics";
import { SubscriptionFormDialog } from "@/components/modules/subscriptions/SubscriptionFormDialog";
import { SubscriptionDetailDialog } from "@/components/modules/subscriptions/SubscriptionDetailDialog";
import { MetaManagerDialog } from "@/components/modules/subscriptions/MetaManagerDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApiResponse, Subscription } from "@/types";

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-28" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 15;

export default function SubscriptionsPage() {
  // ── Meta ──
  const { categories, billingCycles, statuses, refetch: refetchMeta } = useSubscriptionMeta();

  // ── Filter state ──
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId,      setCategoryId]      = useState("");
  const [statusId,        setStatusId]        = useState("");
  const [billingCycleId,  setBillingCycleId]  = useState("");
  const [autopayFilter,   setAutopayFilter]   = useState("");
  const [usageTypeFilter, setUsageTypeFilter] = useState("");

  // ── Data state ──
  const [allSubs,     setAllSubs]     = useState<Subscription[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── View + UI state ──
  const [view,          setView]          = useState<"cards" | "calendar">("cards");
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  // ── Dialog state ──
  const [metaOpen,    setMetaOpen]    = useState(false);
  const [addOpen,     setAddOpen]     = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [detailUuid,  setDetailUuid]  = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchSubs = useCallback(async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: String(LIMIT) };
      if (debouncedSearch) params["search"]         = debouncedSearch;
      if (categoryId)      params["categoryId"]     = categoryId;
      if (statusId)        params["statusId"]       = statusId;
      if (billingCycleId)  params["billingCycleId"] = billingCycleId;
      if (autopayFilter)   params["autopay"]        = autopayFilter;
      if (usageTypeFilter) params["usageType"]      = usageTypeFilter;

      const res = await api.get<ApiResponse<{ subscriptions: Subscription[]; total: number }>>("/subscriptions", { params });
      const { subscriptions, total } = res.data.data;
      setTotal(total);
      setAllSubs(prev => append ? [...prev, ...subscriptions] : subscriptions);
    } catch {
      if (!append) toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, categoryId, statusId, billingCycleId, autopayFilter, usageTypeFilter]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    setPage(1);
    if (isFirstRun.current) { isFirstRun.current = false; }
    fetchSubs(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryId, statusId, billingCycleId, autopayFilter, usageTypeFilter]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchSubs(next, true);
  }

  const hasMore = allSubs.length < total;

  // ── Exports ───────────────────────────────────────────────────────────────

  async function exportCsv() {
    try {
      const res = await api.get("/subscriptions/export/csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV export failed");
    }
  }

  function exportPdf() {
    setAnalyticsOpen(true);
    setTimeout(() => window.print(), 100);
  }

  // ── Filter selects helper ─────────────────────────────────────────────────

  function FilterSelect({
    label, value, onValueChange, placeholder = "All", width = "w-40", options,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
    width?: string;
    options: { value: string; label: string; color?: string }[];
  }) {
    const selected = options.find(o => o.value === value);
    return (
      <Select value={value} onValueChange={v => onValueChange(v ?? "")}>
        <SelectTrigger className={`h-9 text-sm ${width}`}>
          <span className="flex items-center gap-1 truncate min-w-0">
            <span className="text-muted-foreground shrink-0">{label}:</span>
            {selected ? (
              <span className="flex items-center gap-1 truncate">
                {selected.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: selected.color }} />}
                <span className="truncate">{selected.label}</span>
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex items-center gap-1.5">
                {o.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: o.color }} />}
                {o.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const anyFilter = !!(debouncedSearch || categoryId || statusId || billingCycleId || autopayFilter || usageTypeFilter);

  function clearAllFilters() {
    setSearch(""); setDebouncedSearch("");
    setCategoryId(""); setStatusId(""); setBillingCycleId("");
    setAutopayFilter(""); setUsageTypeFilter("");
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print animate-fade-in">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Subscription Tracker</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {total > 0 ? `${total} subscription${total !== 1 ? "s" : ""}` : "Manage your tool subscriptions"}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          {(["cards", "calendar"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex h-8 items-center gap-1.5 px-3 text-xs font-medium transition-all capitalize"
              style={view === v
                ? { background: "var(--accent)", color: "#000" }
                : { background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {v === "cards" ? <LayoutGrid size={13} /> : <CalendarDays size={13} />}
              {v === "cards" ? "Cards" : "Calendar"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-wrap items-center gap-2 no-print animate-fade-in delay-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subscriptions…"
            className="h-9 text-sm pl-8 w-56"
          />
        </div>

        <FilterSelect
          label="Category" value={categoryId} onValueChange={setCategoryId}
          options={categories.map(c => ({ value: String(c.id), label: c.label, color: c.color }))}
        />

        <FilterSelect
          label="Status" value={statusId} onValueChange={setStatusId}
          options={statuses.map(s => ({ value: String(s.id), label: s.label, color: s.color }))}
        />

        <FilterSelect
          label="Billing" value={billingCycleId} onValueChange={setBillingCycleId} width="w-44"
          options={billingCycles.map(b => ({ value: String(b.id), label: b.label, color: b.color }))}
        />

        <FilterSelect
          label="Autopay" value={autopayFilter} onValueChange={setAutopayFilter}
          options={[
            { value: "true",  label: "ON" },
            { value: "false", label: "Manual" },
          ]}
        />

        <FilterSelect
          label="Usage" value={usageTypeFilter} onValueChange={setUsageTypeFilter}
          options={[
            { value: "internal", label: "Internal" },
            { value: "client",   label: "Client Use" },
          ]}
        />

        {anyFilter && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm border border-border text-muted-foreground hover:opacity-70 transition-opacity"
          >
            <X size={13} /> Clear
          </button>
        )}

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <Download size={13} /> Export <ChevronDown size={11} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>
              <Table size={13} /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exportPdf}>
              <FileText size={13} /> Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={14} /> Add Subscription
        </Button>
        <button
          onClick={() => setMetaOpen(true)}
          title="Manage categories, billing cycles & statuses"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          <Settings size={15} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* ── Content: Cards or Calendar ── */}
      <div className="no-print animate-fade-up delay-200">
        {view === "calendar" ? (
          <SubscriptionCalendar
            subs={allSubs}
            onSelectSub={uuid => setDetailUuid(uuid)}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : allSubs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-20 gap-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No subscriptions found</p>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>Add your first subscription</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSubs.map(sub => (
                <SubscriptionCard key={sub.uuid} sub={sub} onClick={() => setDetailUuid(sub.uuid)} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                {loadingMore ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={loadMore} className="px-8">
                    Load More ({total - allSubs.length} remaining)
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Analytics section ── */}
      <div id="analytics-print-section" className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <button
          onClick={() => setAnalyticsOpen(v => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 transition-colors no-print"
          style={{ background: "var(--bg-elevated)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analytics</p>
          <ChevronDown
            size={16}
            className="transition-transform duration-200"
            style={{ transform: analyticsOpen ? "rotate(180deg)" : "rotate(0deg)", color: "var(--text-secondary)" }}
          />
        </button>

        {/* Content - always rendered in print via CSS, toggled by state in UI */}
        <div id="analytics-content" className={analyticsOpen ? "block" : "hidden"}>
          <div className="p-5">
            <SubscriptionAnalytics
              subs={allSubs}
              filters={{
                ...(debouncedSearch  && { search: debouncedSearch }),
                ...(categoryId       && { categoryId }),
                ...(statusId         && { statusId }),
                ...(billingCycleId   && { billingCycleId }),
                ...(autopayFilter    && { autopay: autopayFilter }),
                ...(usageTypeFilter  && { usageType: usageTypeFilter }),
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <MetaManagerDialog
        open={metaOpen}
        onClose={() => { setMetaOpen(false); refetchMeta(); }}
      />

      <SubscriptionFormDialog
        open={addOpen || editingUuid !== null}
        onClose={() => { setAddOpen(false); setEditingUuid(null); }}
        onSaved={() => { setPage(1); fetchSubs(1, false); }}
        editUuid={editingUuid}
        categories={categories}
        billingCycles={billingCycles}
        statuses={statuses}
      />

      <SubscriptionDetailDialog
        open={detailUuid !== null}
        onClose={() => setDetailUuid(null)}
        uuid={detailUuid}
        onEdit={(uuid) => { setDetailUuid(null); setEditingUuid(uuid); }}
        onDeleted={() => { setDetailUuid(null); setPage(1); fetchSubs(1, false); }}
        categories={categories}
        billingCycles={billingCycles}
        statuses={statuses}
      />
    </div>
  );
}
