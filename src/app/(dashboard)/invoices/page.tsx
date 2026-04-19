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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Download,
  Send,
  CheckCircle,
  Trash2,
  MoreHorizontal,
  FileText,
  Loader2,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

const STATUS_OPTIONS = ["", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

const MONTHS = [
  "","January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const YEARS = ["", ...Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i))];

function statusColor(s: string) {
  if (s === "PAID")      return "bg-green-100 text-green-800";
  if (s === "SENT")      return "bg-blue-100 text-blue-800";
  if (s === "OVERDUE")   return "bg-red-100 text-red-800";
  if (s === "CANCELLED") return "bg-gray-100 text-gray-600";
  return "bg-yellow-100 text-yellow-800";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
      if (status) params["status"] = status;
      if (month)  params["month"]  = month;
      if (year)   params["year"]   = year;
      const res = await api.get("/invoices", { params });
      setInvoices(res.data.data.invoices);
      setTotal(res.data.data.total);
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

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage client invoices</p>
        </div>
        <Link href="/invoices/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Collected"
            value={`₹${fmt(stats.totalCollected)}`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            label="Sent / Pending"
            value={stats.sent}
            sub={`${stats.draft} drafts`}
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={<AlertCircle className="h-5 w-5 text-red-600" />}
            color="bg-red-50"
          />
          <StatCard
            label="Paid"
            value={stats.paid}
            sub={`of ${stats.total} total`}
            icon={<CheckCircle className="h-5 w-5 text-indigo-600" />}
            color="bg-indigo-50"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by number or client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={status || "_all"} onValueChange={(v: string | null) => setStatus(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month || "_all"} onValueChange={(v: string | null) => setMonth(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All months</SelectItem>
            {MONTHS.filter(Boolean).map((m, i) => (
              <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year || "_all"} onValueChange={(v: string | null) => setYear(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All years</SelectItem>
            {YEARS.filter(Boolean).map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No invoices found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Issue Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(inv => {
                const isOverdue = inv.status === "SENT" && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className={`hover:bg-gray-50 ${isOverdue ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.client?.companyName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                        {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{fmt(Number(inv.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${statusColor(isOverdue ? "OVERDUE" : inv.status)} border-0 text-xs`}>
                        {isOverdue ? "OVERDUE" : inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}>
                            <Download className="h-4 w-4 mr-2" />Download PDF
                          </DropdownMenuItem>
                          {inv.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => sendInvoice(inv.id)}>
                              <Send className="h-4 w-4 mr-2" />Send to Client
                            </DropdownMenuItem>
                          )}
                          {inv.status === "SENT" && (
                            <DropdownMenuItem onClick={() => markPaid(inv.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {inv.status === "DRAFT" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteInvoice(inv.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <div className="flex items-center justify-between text-sm text-gray-500">
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
