"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/utils";
import { ArrowLeft, Download, Send, Pencil, CheckCircle, Loader2 } from "lucide-react";

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
}

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  if (!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return "—";
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:   "bg-slate-100 text-slate-600 border-slate-200",
  SENT:    "bg-blue-50 text-blue-700 border-blue-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function statusLabel(inv: Invoice) {
  if (inv.status === "SENT" && new Date(inv.dueDate) < new Date()) return "OVERDUE";
  return inv.status;
}

export default function InvoiceViewPage() {
  const router = useRouter();
  const params = useParams();
  const uuid   = String(params["uuid"]);

  const [invoice, setInvoice]   = useState<Invoice | null>(null);
  const [company, setCompany]   = useState<CompanySettings>({ company_name: null, company_tagline: null, company_email: null, company_logo_url: null });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [acting, setActing]     = useState(false);
  const [actionErr, setActionErr] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ data: Invoice }>(`/invoices/${uuid}`),
      api.get<{ data: CompanySettings }>("/settings/general"),
    ])
      .then(([invRes, settingsRes]) => {
        setInvoice(invRes.data.data);
        setCompany(settingsRes.data.data);
      })
      .catch(() => setError("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [uuid]);

  async function handleDownload() {
    try {
      const res = await api.get(`/invoices/${uuid}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice!.invoiceNumber.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionErr("Failed to download PDF.");
    }
  }

  async function handleSend() {
    if (!invoice) return;
    setActing(true); setActionErr("");
    try {
      await api.post(`/invoices/${uuid}/send`);
      setInvoice(prev => prev ? { ...prev, status: "SENT" } : prev);
    } catch (e: unknown) {
      setActionErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to send invoice.");
    } finally {
      setActing(false);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setActing(true); setActionErr("");
    try {
      await api.patch(`/invoices/${uuid}/mark-paid`);
      setInvoice(prev => prev ? { ...prev, status: "PAID" } : prev);
    } catch (e: unknown) {
      setActionErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to mark as paid.");
    } finally {
      setActing(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (error || !invoice) return (
    <div className="p-6 text-center text-red-500 text-sm">{error || "Invoice not found."}</div>
  );

  const sl        = statusLabel(invoice);
  const apiBase   = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000/api").replace("/api", "");
  const logoSrc   = resolveAssetUrl(company.company_logo_url);
  const orgName   = company.company_name || "Your Company";
  const tagline   = company.company_tagline || "";
  const subtotal  = Number(invoice.subtotal);
  const gstAmt    = Number(invoice.gstAmount);
  const total     = Number(invoice.total);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500">{invoice.client?.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" && (
            <Link href={`/invoices/${uuid}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1.5" />Edit
              </Button>
            </Link>
          )}
          {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
            <Button variant="outline" size="sm" onClick={handleSend} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              {invoice.status === "DRAFT" ? "Send Invoice" : "Resend"}
            </Button>
          )}
          {(invoice.status === "SENT" || statusLabel(invoice) === "OVERDUE") && (
            <Button size="sm" onClick={handleMarkPaid} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {acting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
              Mark Paid
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />Download PDF
          </Button>
        </div>
      </div>

      {actionErr && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{actionErr}</p>
      )}

      {/* Invoice card — matches the live preview layout */}
      <div className="animate-fade-up delay-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Blue header */}
        <div className="p-6" style={{ background: "#1d4ed8" }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              {logoSrc && (
                <img
                  src={logoSrc}
                  alt={orgName}
                  className="h-12 w-12 rounded-lg object-contain bg-white/10 p-0.5"
                />
              )}
              <div>
                <p className="text-2xl font-bold text-white">{orgName}</p>
                {tagline && <p className="text-blue-200 text-sm">{tagline}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">INVOICE</p>
              <p className="text-blue-200 text-sm mt-1">{invoice.invoiceNumber}</p>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold mt-2 ${STATUS_STYLE[sl] ?? STATUS_STYLE["DRAFT"]}`}>
                {sl}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To + Dates */}
        <div className="px-6 py-5 border-b border-slate-100 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Bill To</p>
            <p className="font-semibold text-slate-800 text-base">{invoice.client?.companyName}</p>
            {invoice.client?.email && <p className="text-sm text-slate-500 mt-0.5">{invoice.client.email}</p>}
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Issue Date</p>
              <p className="font-medium text-slate-700">{fmtDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Due Date</p>
              <p className={`font-medium ${sl === "OVERDUE" ? "text-red-600" : "text-slate-700"}`}>{fmtDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Milestone */}
        {invoice.milestone && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
            <p className="text-[10px] text-indigo-600 font-semibold uppercase mb-0.5">Milestone</p>
            <p className="text-slate-700 text-sm">{invoice.milestone}</p>
          </div>
        )}

        {/* Line items */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1d4ed8" }} className="text-white">
                <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase rounded-tl">Description</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase w-16">Qty</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase w-28">Unit Price</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase rounded-tr w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                  <td className="py-2 px-3 text-slate-700">{item.description}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{fmtINR(item.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-800">{fmtINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 pb-5">
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-end gap-16 text-slate-600">
              <span>Subtotal</span><span className="w-28 text-right">{fmtINR(subtotal)}</span>
            </div>
            {Number(invoice.gstRate) > 0 && (
              <div className="flex justify-end gap-16 text-slate-600">
                <span>GST ({invoice.gstRate}%)</span><span className="w-28 text-right">{fmtINR(gstAmt)}</span>
              </div>
            )}
            <div className="flex justify-end gap-16 font-bold text-white rounded px-3 py-1.5 mt-1" style={{ background: "#1d4ed8" }}>
              <span>Total</span><span className="w-28 text-right">{fmtINR(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-6 pb-5 border-t border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400 mt-4 mb-1.5">Notes</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
