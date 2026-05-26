"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import api from "@/lib/api";
import type { Invoice } from "@/types";

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  if (!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(inv: Invoice) {
  return inv.status === "SENT" && new Date(inv.dueDate) < new Date();
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:   "bg-slate-100 text-slate-600 border-slate-200",
  SENT:    "bg-blue-50 text-blue-700 border-blue-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function statusLabel(inv: Invoice) {
  if (isOverdue(inv)) return "OVERDUE";
  return inv.status;
}

interface Summary {
  totalContractValue: number | null;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
}

interface Props {
  clientId: number;
}

export function PaymentsTab({ clientId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary]   = useState<Summary>({ totalContractValue: null, totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: { invoices: Invoice[] } }>(`/invoices?clientId=${clientId}&limit=500`),
      api.get<{ data: Summary }>(`/invoices/client-balance/${clientId}`),
    ])
      .then(([invRes, balRes]) => {
        setInvoices(invRes.data.data?.invoices ?? []);
        setSummary(balRes.data.data);
      })
      .catch(() => setError("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, [clientId]);

  const { totalContractValue, totalInvoiced, totalPaid, totalOutstanding } = summary;

  if (loading) {
    return <p className="text-center py-10 text-sm text-slate-400">Loading invoices…</p>;
  }

  if (error) {
    return <p className="text-center py-10 text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-medium text-violet-700 uppercase tracking-wide">Contract Value</p>
          <p className="mt-1 text-xl font-bold text-violet-800">
            {totalContractValue != null ? fmtINR(totalContractValue) : <span className="text-sm font-normal text-violet-400">Not set</span>}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Invoiced</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{fmtINR(totalInvoiced)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Paid</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{fmtINR(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{fmtINR(totalOutstanding)}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
        <Link
          href={`/invoices/new?clientId=${clientId}`}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-[#0F172A] hover:bg-slate-700 text-white transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="text-center py-10 text-sm text-slate-400">No invoices for this client yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Issue Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">View</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const sl = statusLabel(inv);
                return (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtINR(Number(inv.total))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[sl] ?? STATUS_STYLE["DRAFT"]}`}>
                        {sl}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/invoices/${inv.uuid}`}
                        className="inline-flex items-center justify-center h-6 w-6 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="View invoice"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
