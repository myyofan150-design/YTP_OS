"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Invoice, InvoiceStats } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Download,
  Send,
  CheckCircle,
  Trash2,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
} from "lucide-react";

const STATUS_OPTIONS = ["DRAFT", "SENT", "PAID", "OVERDUE"];

const MONTHS = [
  "","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const YEARS = ["", ...Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i))];

function statusColor(s: string) {
  if (s === "PAID")      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "SENT")      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (s === "OVERDUE")   return "bg-red-500/10 text-red-600 border-red-500/20";
  if (s === "CANCELLED") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function StatCard({ label, value, sub, icon, iconBg, index = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; iconBg: string; index?: number;
}) {
  return (
    <div
      className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5 flex items-start gap-4"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [stats, setStats]       = useState<InvoiceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("");
  const [month, setMonth]       = useState("");
  const [year, setYear]         = useState("");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      // OVERDUE is derived (SENT + past due) — fetch SENT from server, filter client-side
      if (status && status !== "OVERDUE") params["status"] = status;
      else if (status === "OVERDUE") params["status"] = "SENT";
      if (month)  params["month"]  = month;
      if (year)   params["year"]   = year;
      const res = await api.get("/invoices", { params });
      let rows: Invoice[] = res.data.data.invoices;
      if (status === "OVERDUE") {
        const now = new Date();
        rows = rows.filter(inv => new Date(inv.dueDate) < now);
      }
      setInvoices(rows);
      setTotal(status === "OVERDUE" ? rows.length : res.data.data.total);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [status, month, year, page]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/invoices/stats");
      setStats(res.data.data);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [status, month, year]);
  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.client?.companyName.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  async function sendInvoice(id: number) {
    try {
      await api.post(`/invoices/${id}/send`);
      load(); loadStats();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    }
  }

  async function markPaid(id: number) {
    try {
      await api.patch(`/invoices/${id}/mark-paid`);
      load(); loadStats();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("Delete this draft invoice?")) return;
    try {
      await api.delete(`/invoices/${id}`);
      load(); loadStats();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    }
  }

  async function downloadPdf(id: number, number: string) {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${number.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF");
    }
  }

  async function previewPdf(id: number) {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, "_blank");
    } catch {
      alert("Failed to preview PDF");
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            index={0}
            label="Total Collected"
            value={`₹${fmt(stats.totalCollected)}`}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
          />
          <StatCard
            index={1}
            label="Sent / Pending"
            value={stats.sent}
            sub={`${stats.draft} drafts`}
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-500/10"
          />
          <StatCard
            index={2}
            label="Overdue"
            value={stats.overdue}
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            iconBg="bg-red-500/10"
          />
          <StatCard
            index={3}
            label="Paid"
            value={stats.paid}
            sub={`of ${stats.total} total`}
            icon={<CheckCircle className="h-5 w-5 text-primary" />}
            iconBg="bg-primary/10"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-in delay-200">
        <Input
          placeholder="Search by number or client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 h-9 text-sm"
        />
        <Select value={status || "_all"} onValueChange={(v: string | null) => setStatus(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><span className="text-muted-foreground mr-1 shrink-0">Status:</span><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={month || "_all"} onValueChange={(v: string | null) => setMonth(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><span className="text-muted-foreground mr-1 shrink-0">Month:</span><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {MONTHS.filter(Boolean).map((m, i) => (
              <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year || "_all"} onValueChange={(v: string | null) => setYear(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-36 text-sm"><span className="text-muted-foreground mr-1 shrink-0">Year:</span><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {YEARS.filter(Boolean).map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link href="/invoices/new" className="ml-auto">
          <Button className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" />New Invoice
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-300 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No invoices found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issue Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const isOverdue = inv.status === "SENT" && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${isOverdue ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{inv.client?.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                        {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      ₹{fmt(Number(inv.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${statusColor(isOverdue ? "OVERDUE" : inv.status)} border text-xs`}>
                        {isOverdue ? "OVERDUE" : inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => previewPdf(inv.id)}
                          title="Preview PDF"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                          title="Download PDF"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {inv.status === "DRAFT" && (
                          <Link href={`/invoices/${inv.uuid}/edit`} title="Edit invoice">
                            <span className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <Pencil className="h-4 w-4" />
                            </span>
                          </Link>
                        )}
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => sendInvoice(inv.id)}
                            title="Send to client"
                            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {(inv.status === "SENT" || isOverdue) && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            title="Mark as paid"
                            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => deleteInvoice(inv.id)}
                            title="Delete invoice"
                            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} invoices total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
