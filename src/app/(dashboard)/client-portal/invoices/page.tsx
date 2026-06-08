"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Eye, Download } from "lucide-react";

async function openPdf(id: number, invoiceNumber: string, download: boolean) {
  try {
    const res = await api.get(`/client-portal/invoices/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    if (download) {
      const a = document.createElement("a");
      a.href = url; a.download = `${invoiceNumber.replace(/\//g, "-")}.pdf`; a.click();
    } else {
      window.open(url, "_blank");
    }
    URL.revokeObjectURL(url);
  } catch {
    alert("Failed to load PDF");
  }
}

interface Invoice {
  id: number;
  uuid: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  gstRate: number | null;
  gstAmount: number | null;
  total: number;
  status: string;
  paidDate: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

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

export default function ClientPortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/client-portal/invoices");
      setInvoices(r.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = invoices.reduce(
    (acc, inv) => {
      if (inv.status === "PAID")    acc.paid    += inv.total;
      if (inv.status === "SENT")    acc.pending += inv.total;
      if (inv.status === "OVERDUE") acc.overdue += inv.total;
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0 }
  );

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Paid",    value: totals.paid,    color: "#22c55e" },
          { label: "Pending",       value: totals.pending, color: "#6366f1" },
          { label: "Overdue",       value: totals.overdue, color: "#ef4444" },
        ].map(({ label, value, color }, i) => (
          <div
            key={label}
            className="card-hover animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, ${color}, transparent 70%)` }} />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1" style={{ color }}>₹{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="animate-fade-up rounded-2xl border border-border bg-card overflow-hidden" style={{ animationDelay: "210ms" }}>
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
            Loading...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={36} className="text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issue Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const isOverdue = inv.status === "SENT" && inv.dueDate != null && new Date(inv.dueDate) < new Date();
                const displayStatus = isOverdue ? "OVERDUE" : inv.status;
                return (
                  <tr key={inv.id} className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${isOverdue ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.dueDate ? (
                        <span className={isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                          {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      ₹{fmt(Number(inv.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${statusColor(displayStatus)} border text-xs`}>
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== "DRAFT" && (
                          <>
                            <button
                              onClick={() => openPdf(inv.id, inv.invoiceNumber, false)}
                              title="Preview PDF"
                              className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openPdf(inv.id, inv.invoiceNumber, true)}
                              title="Download PDF"
                              className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </>
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
    </div>
  );
}
