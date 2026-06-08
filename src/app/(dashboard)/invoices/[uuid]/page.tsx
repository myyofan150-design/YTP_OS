"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/utils";
import { ArrowLeft, Download, Send, Pencil, CheckCircle, Loader2, MapPin, Phone, Mail } from "lucide-react";

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_seal_url: string | null;
}

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  if (!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
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

const TEAL = "#2AB5A2";

export default function InvoiceViewPage() {
  const router = useRouter();
  const params = useParams();
  const uuid   = String(params["uuid"]);

  const [invoice, setInvoice]     = useState<Invoice | null>(null);
  const [company, setCompany]     = useState<CompanySettings>({
    company_name: null, company_tagline: null, company_email: null,
    company_logo_url: null, company_phone: null, company_address: null, company_seal_url: null,
  });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [acting, setActing]       = useState(false);
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
      const a   = document.createElement("a");
      a.href     = url;
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

  const sl       = statusLabel(invoice);
  const logoSrc  = resolveAssetUrl(company.company_logo_url);
  const orgName  = company.company_name  || "Your Company";
  const tagline  = company.company_tagline || "";
  const subtotal = Number(invoice.subtotal);
  const gstAmt   = Number(invoice.gstAmount);
  const gstRate  = Number(invoice.gstRate);
  const total    = Number(invoice.total);

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
          {(invoice.status === "SENT" || sl === "OVERDUE") && (
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

      {/* Invoice preview */}
      <div className="animate-fade-up delay-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">

        {/* Header: logo | INVOICE. */}
        <div className="px-8 pt-8 pb-5 flex justify-between items-center">
          <div>
            {logoSrc ? (
              <img src={logoSrc} alt={orgName} className="h-16 w-auto max-w-xs object-contain" />
            ) : (
              <div>
                <p className="font-bold text-lg text-slate-900 leading-tight">{orgName}</p>
                {tagline && <p className="text-slate-500 text-sm">{tagline}</p>}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-5xl font-black tracking-tight" style={{ color: TEAL }}>INVOICE.</p>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold mt-1.5 ${STATUS_STYLE[sl] ?? STATUS_STYLE["DRAFT"]}`}>
              {sl}
            </span>
          </div>
        </div>

        {/* Info bar */}
        <div className="mx-6 mb-5 rounded-lg p-5" style={{ background: "#F5F7F8" }}>
          <div className="grid grid-cols-3 gap-4">
            {/* Invoice To */}
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">Invoice to :</p>
              <p className="text-xl font-bold text-slate-900 leading-tight">{invoice.client?.companyName}</p>
              {invoice.client?.contactPerson && (
                <p className="text-sm text-slate-600 mt-1">{invoice.client.contactPerson}</p>
              )}
              {invoice.client?.email && (
                <p className="text-sm text-slate-500">{invoice.client.email}</p>
              )}
              {invoice.client?.address && (
                <p className="text-sm text-slate-500">{invoice.client.address}</p>
              )}
            </div>

            {/* Total Due */}
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Total Due :</p>
              <p className="text-3xl font-black" style={{ color: TEAL }}>{fmtINR(total)}</p>
            </div>

            {/* Date + Invoice No */}
            <div className="text-right space-y-3">
              <div>
                <p className="text-xs text-slate-400 font-medium">Date :</p>
                <p className="font-semibold text-slate-800 text-sm">{fmtDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Invoice No :</p>
                <p className="font-semibold text-slate-800 text-sm">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone */}
        {invoice.milestone && (
          <div className="mx-6 mb-4 px-4 py-2.5 rounded-md border border-teal-100" style={{ background: "#f0fdfa" }}>
            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: TEAL }}>Milestone</p>
            <p className="text-sm text-slate-700">{invoice.milestone}</p>
          </div>
        )}

        {/* Line items table */}
        <div className="px-6 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: TEAL }}>
                <th className="py-3 px-3 text-white text-xs font-bold uppercase text-center w-10 rounded-tl-md">ITEM</th>
                <th className="py-3 px-3 text-white text-xs font-bold uppercase text-left">DESCRIPTIONS</th>
                <th className="py-3 px-3 text-white text-xs font-bold uppercase text-right w-28">PRICE</th>
                <th className="py-3 px-3 text-white text-xs font-bold uppercase text-right w-14">QTY</th>
                <th className="py-3 px-3 text-white text-xs font-bold uppercase text-right w-28 rounded-tr-md">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100"
                  style={{ background: idx % 2 === 0 ? "#FFFFFF" : "#F8F9FA" }}
                >
                  <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-3 font-medium text-slate-800">{item.description}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{fmtINR(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800">{fmtINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 mb-6">
          <div className="flex justify-end">
            <div className="w-72 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>SUB TOTAL</span>
                <span className="font-medium">{fmtINR(subtotal)}</span>
              </div>
              {gstRate > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                  <span>TAX {invoice.gstRate}%</span>
                  <span className="font-medium">{fmtINR(gstAmt)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-white px-3 py-2.5 rounded mt-2"
                style={{ background: TEAL }}
              >
                <span>TOTAL</span>
                <span>{fmtINR(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mx-6 mb-6 pt-5 border-t border-slate-100 flex justify-between items-start gap-6">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 mb-3">Terms &amp; Conditions</h3>
            <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
              <li>Payment is due within the agreed payment period from the date of invoice issuance.</li>
              <li>A late payment charge of 2% per month may be applied to outstanding balances beyond the due date.</li>
              <li>Any disputes regarding the invoice must be raised in writing within 7 days of receipt.</li>
              <li>All services rendered are non-refundable unless otherwise agreed upon in writing by both parties.</li>
              <li>Applicable taxes, duties, or government levies will be charged as per prevailing regulations.</li>
              <li>Any bank transfer fees, transaction charges, or intermediary banking costs shall be borne by the client.</li>
            </ol>
          </div>
          {/* Seal */}
          {company.company_seal_url ? (
            <img
              src={resolveAssetUrl(company.company_seal_url) ?? ""}
              alt="Company seal"
              className="flex-shrink-0 h-24 w-24 object-contain"
            />
          ) : logoSrc ? (
            <div
              className="flex-shrink-0 h-24 w-24 rounded-full border-4 flex items-center justify-center overflow-hidden"
              style={{ borderColor: TEAL }}
            >
              <img src={logoSrc} alt={orgName} className="h-16 w-16 object-contain" />
            </div>
          ) : (
            <div
              className="flex-shrink-0 h-24 w-24 rounded-full border-4 flex items-center justify-center"
              style={{ borderColor: TEAL }}
            >
              <span className="text-xs font-bold text-center px-2" style={{ color: TEAL }}>{orgName}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mx-6 mb-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Notes</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer teal bar */}
        <div className="px-6 flex items-center" style={{ background: TEAL, minHeight: 56 }}>
          {/* Left: Thanks message */}
          <div className="flex-shrink-0 py-3">
            <p className="text-white font-bold text-sm">Thanks for Business With Us!</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>We make easy for your Problems.</p>
          </div>

          {/* Vertical divider */}
          <div className="mx-5 self-stretch w-px flex-shrink-0" style={{ background: "rgba(255,255,255,0.35)" }} />

          {/* Contact details — equal-width slots, text truncates */}
          <div className="flex items-center text-white text-[11px] flex-1 min-w-0">
            {company.company_address && (
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{company.company_address}</span>
              </span>
            )}
            {company.company_phone && (
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{company.company_phone}</span>
              </span>
            )}
            {company.company_email && (
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{company.company_email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-slate-400 py-4">
          This is a computer-generated invoice and does not require a physical signature.
        </p>
      </div>
    </div>
  );
}
