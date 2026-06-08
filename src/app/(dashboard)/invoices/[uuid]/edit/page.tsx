"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { Invoice } from "@/types";
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, ArrowLeft, Save, Send, MapPin, Phone, Mail, AlertTriangle, Info } from "lucide-react";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface BalanceData {
  totalContractValue: number | null;
  totalInvoiced: number;
  balance: number | null;
}

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_seal_url: string | null;
}

const TEAL = "#2AB5A2";

function calcItem(item: LineItem) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtD(s: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Live invoice preview ──────────────────────────────────────────────────────
function InvoicePreview({
  company, clientName, issueDate, dueDate, milestone, lineItems, gstRate, notes, invoiceNum,
}: {
  company: CompanySettings;
  clientName: string;
  issueDate: string;
  dueDate: string;
  milestone: string;
  lineItems: LineItem[];
  gstRate: string;
  notes: string;
  invoiceNum: string;
}) {
  const subtotal = lineItems.reduce((s, i) => s + calcItem(i), 0);
  const gstAmt   = subtotal * (parseFloat(gstRate) / 100 || 0);
  const total    = subtotal + gstAmt;
  const fmtDate  = (s: string) => {
    if (!s) return "—";
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
  };
  const logoSrc = resolveAssetUrl(company.company_logo_url);
  const sealSrc = resolveAssetUrl(company.company_seal_url);
  const orgName = company.company_name  || "Your Company";
  const tagline = company.company_tagline || "";
  const visibleItems = lineItems.filter(i => i.description);

  return (
    <div className="text-xs font-sans text-slate-800 bg-white" style={{ lineHeight: 1.4 }}>

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex justify-between items-center">
        <div>
          {logoSrc ? (
            <img src={logoSrc} alt={orgName} className="h-12 w-auto max-w-[200px] object-contain" />
          ) : (
            <div>
              <p className="font-bold text-sm text-slate-900 leading-tight">{orgName}</p>
              {tagline && <p className="text-slate-500 text-[10px]">{tagline}</p>}
            </div>
          )}
        </div>
        <p className="text-3xl font-black tracking-tight" style={{ color: TEAL }}>INVOICE.</p>
      </div>

      {/* Info bar */}
      <div className="mx-4 mb-4 rounded-lg p-4" style={{ background: "#F5F7F8" }}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] text-slate-400 font-medium mb-0.5">Invoice to :</p>
            <p className="font-bold text-sm text-slate-900 leading-tight">{clientName || "—"}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[9px] text-slate-400 font-medium mb-0.5">Total Due :</p>
            <p className="text-lg font-black" style={{ color: TEAL }}>{fmtINR(total)}</p>
          </div>
          <div className="text-right space-y-2">
            <div>
              <p className="text-[9px] text-slate-400 font-medium">Date :</p>
              <p className="font-semibold text-[10px] text-slate-800">{fmtDate(issueDate)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-medium">Invoice No :</p>
              <p className="font-semibold text-[10px] text-slate-800">{invoiceNum || "INV/YYYY/NNN"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone */}
      {milestone && (
        <div className="mx-4 mb-3 px-3 py-2 rounded border border-teal-100" style={{ background: "#f0fdfa" }}>
          <p className="text-[9px] font-semibold uppercase mb-0.5" style={{ color: TEAL }}>Milestone</p>
          <p className="text-[10px] text-slate-700">{milestone}</p>
        </div>
      )}

      {/* Items table */}
      <div className="px-4 mb-4">
        <table className="w-full">
          <thead>
            <tr style={{ background: TEAL }}>
              <th className="py-2 px-2 text-white text-[9px] font-bold uppercase text-center w-8 rounded-tl-sm">ITEM</th>
              <th className="py-2 px-2 text-white text-[9px] font-bold uppercase text-left">DESCRIPTIONS</th>
              <th className="py-2 px-2 text-white text-[9px] font-bold uppercase text-right w-16">PRICE</th>
              <th className="py-2 px-2 text-white text-[9px] font-bold uppercase text-right w-10">QTY</th>
              <th className="py-2 px-2 text-white text-[9px] font-bold uppercase text-right w-16 rounded-tr-sm">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? visibleItems.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100" style={{ background: idx % 2 === 0 ? "#FFFFFF" : "#F8F9FA" }}>
                <td className="py-1.5 px-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                <td className="py-1.5 px-2 font-medium text-slate-800">{item.description}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.unitPrice ? fmtINR(parseFloat(item.unitPrice)) : "—"}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.quantity || 1}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-800">{fmtINR(calcItem(item))}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-5 text-center text-slate-300 italic">Add line items…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-4 mb-4">
        <div className="flex justify-end">
          <div className="w-52 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
              <span>SUB TOTAL</span><span className="font-medium">{fmtINR(subtotal)}</span>
            </div>
            {parseFloat(gstRate) > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                <span>TAX {gstRate}%</span><span className="font-medium">{fmtINR(gstAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-white px-2 py-1.5 rounded mt-1.5" style={{ background: TEAL }}>
              <span>TOTAL</span><span>{fmtINR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="mx-4 mb-4 pt-3 border-t border-slate-100 flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="font-bold text-[10px] text-slate-900 mb-1.5">Terms &amp; Conditions</p>
          <ol className="text-[9px] text-slate-500 space-y-1 list-decimal list-inside">
            <li>Payment is due within the agreed payment period from the date of invoice issuance.</li>
            <li>A late payment charge of 2% per month may be applied to outstanding balances.</li>
            <li>Any disputes must be raised in writing within 7 days of receipt.</li>
            <li>All services rendered are non-refundable unless otherwise agreed.</li>
            <li>Applicable taxes will be charged as per prevailing regulations.</li>
            <li>Bank transfer fees shall be borne by the client.</li>
          </ol>
        </div>
        {sealSrc ? (
          <img src={sealSrc} alt="Company seal" className="flex-shrink-0 h-16 w-16 object-contain" />
        ) : logoSrc ? (
          <div className="flex-shrink-0 h-16 w-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: TEAL }}>
            <img src={logoSrc} alt={orgName} className="h-11 w-11 object-contain" />
          </div>
        ) : null}
      </div>

      {/* Notes */}
      {notes && (
        <div className="mx-4 mb-3 pt-2 border-t border-slate-100">
          <p className="text-[9px] uppercase font-semibold text-slate-400 mb-1">Notes</p>
          <p className="text-[10px] text-slate-600">{notes}</p>
        </div>
      )}

      {/* Footer teal bar */}
      <div className="px-5 flex items-center" style={{ background: TEAL, minHeight: 44 }}>
        <div className="flex-shrink-0 py-2.5">
          <p className="text-white font-bold text-[10px]">Thanks for Business With Us!</p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.75)" }}>We make easy for your Problems.</p>
        </div>
        <div className="mx-3 self-stretch w-px flex-shrink-0" style={{ background: "rgba(255,255,255,0.35)" }} />
        <div className="flex items-center text-white text-[9px] flex-1 min-w-0">
          {company.company_address && (
            <span className="flex-1 min-w-0 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{company.company_address}</span>
            </span>
          )}
          {company.company_phone && (
            <span className="flex-1 min-w-0 flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{company.company_phone}</span>
            </span>
          )}
          {company.company_email && (
            <span className="flex-1 min-w-0 flex items-center gap-1">
              <Mail className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{company.company_email}</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-center text-[9px] text-slate-400 py-2.5">
        This is a computer-generated invoice and does not require a physical signature.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EditInvoicePage() {
  const router  = useRouter();
  const params  = useParams();
  const uuid    = String(params["uuid"]);

  const [invoice, setInvoice]     = useState<Invoice | null>(null);
  const [company, setCompany]     = useState<CompanySettings>({ company_name: null, company_tagline: null, company_email: null, company_logo_url: null, company_phone: null, company_address: null, company_seal_url: null });
  const [loading, setLoading]     = useState(true);
  const [fetchErr, setFetchErr]   = useState("");

  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [gstRate, setGstRate]     = useState("18");
  const [milestone, setMilestone] = useState("");
  const [notes, setNotes]         = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Invoice }>(`/invoices/${uuid}`),
      api.get<{ data: CompanySettings }>("/settings/general"),
    ])
      .then(([invRes, settingsRes]) => {
        const inv = invRes.data.data;
        setInvoice(inv);
        setIssueDate(inv.issueDate?.slice(0, 10) ?? "");
        setDueDate(inv.dueDate?.slice(0, 10) ?? "");
        setGstRate(String(inv.gstRate ?? 18));
        setMilestone(inv.milestone ?? "");
        setNotes(inv.notes ?? "");
        if (inv.lineItems && inv.lineItems.length > 0) {
          setLineItems(inv.lineItems.map(i => ({
            description: i.description,
            quantity: String(i.quantity),
            unitPrice: String(i.unitPrice),
          })));
        }
        setCompany(settingsRes.data.data);
        // Fetch client balance after we know the clientId
        if (inv.clientId) {
          api.get<{ data: BalanceData }>(`/invoices/client-balance/${inv.clientId}`)
            .then(r => setBalanceData(r.data.data))
            .catch(() => { /* balance is optional — don't block the form */ });
        }
      })
      .catch(() => setFetchErr("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [uuid]);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setLineItems(prev => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce((s, i) => s + calcItem(i), 0);
  const gstAmt   = subtotal * (parseFloat(gstRate) / 100 || 0);
  const total    = subtotal + gstAmt;

  // Available budget = contract balance + current draft's saved total (add back since totalInvoiced includes it)
  const availableBalance: number | null =
    balanceData?.balance != null && invoice
      ? balanceData.balance + (invoice.total ?? 0)
      : null;

  const overBudget = availableBalance !== null && total > availableBalance + 0.005;

  async function save(andSend: boolean) {
    setError("");
    const validItems = lineItems.filter(i => i.description && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) { setError("Add at least one line item with description and price"); return; }
    if (overBudget) {
      setError(`Invoice total ${fmtINR(total)} exceeds the available balance of ${fmtINR(availableBalance!)}. Reduce line items before saving.`);
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/invoices/${uuid}`, {
        issueDate,
        dueDate,
        gstRate:   parseFloat(gstRate) || 0,
        milestone: milestone || null,
        notes:     notes || null,
        lineItems: validItems.map(i => ({
          description: i.description,
          quantity:    parseFloat(i.quantity) || 1,
          unitPrice:   parseFloat(i.unitPrice),
        })),
      });
      if (andSend) {
        await api.post(`/invoices/${uuid}/send`);
      }
      router.push("/invoices");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (fetchErr || !invoice) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">{fetchErr || "Invoice not found."}</div>
    );
  }

  if (invoice.status !== "DRAFT") {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800 text-lg mb-1">Cannot Edit Invoice</p>
          <p className="text-sm text-amber-700">
            Only <strong>DRAFT</strong> invoices can be edited. This invoice is <strong>{invoice.status}</strong>.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Go Back
        </Button>
      </div>
    );
  }

  const clientName = invoice.client?.companyName ?? "";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-500">{invoice.invoiceNumber} · {clientName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-up delay-100">
        {/* ── LEFT: Form ───────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Client (read-only) + Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Invoice Details</h2>

            {/* Balance summary banner */}
            {balanceData?.totalContractValue != null && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${overBudget ? "bg-red-50 border-red-200" : "bg-sky-50 border-sky-200"}`}>
                <div className="flex items-start gap-2">
                  {overBudget
                    ? <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    : <Info className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  }
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <span className={overBudget ? "text-red-700" : "text-sky-700"}>
                        Contract value: <strong>{fmtINR(balanceData.totalContractValue)}</strong>
                      </span>
                      <span className={overBudget ? "text-red-700" : "text-sky-700"}>
                        Other invoices: <strong>{fmtINR(balanceData.totalInvoiced - (invoice?.total ?? 0))}</strong>
                      </span>
                    </div>
                    <div className={`font-semibold ${overBudget ? "text-red-700" : "text-emerald-700"}`}>
                      Available for this invoice: {fmtINR(availableBalance!)}
                      {overBudget && <span className="ml-2 font-normal text-red-600">(current total exceeds by {fmtINR(total - availableBalance!)})</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {balanceData?.totalContractValue == null && balanceData !== null && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                No contract value set for this client — no budget limit enforced.
              </div>
            )}

            <div>
              <Label>Client</Label>
              <div className="flex items-center h-10 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {clientName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date *</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Milestone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. 50% advance, Phase 2 delivery…"
                value={milestone}
                onChange={e => setMilestone(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Line Items</h2>
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-1 text-right">Amount</span>
              <span className="col-span-1" />
            </div>
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 sm:col-span-6">
                  <Input placeholder="Description" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input type="number" min="0.01" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="text-right" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input type="number" min="0" step="0.01" placeholder="₹ Price" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} className="text-right" />
                </div>
                <div className="col-span-3 sm:col-span-1 text-right text-sm font-medium text-gray-700">
                  {fmtINR(calcItem(item))}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />Add Line Item
            </Button>
          </div>

          {/* GST + Notes + Submit */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Summary &amp; Notes</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GST Rate (%)</Label>
                <Input type="number" min="0" max="28" step="0.01" value={gstRate} onChange={e => setGstRate(e.target.value)} />
              </div>
              <div className="space-y-1 text-sm pt-5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>{fmtINR(subtotal)}</span>
                </div>
                {parseFloat(gstRate) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST</span><span>{fmtINR(gstAmt)}</span>
                  </div>
                )}
                <div className={`flex justify-between font-bold border-t border-slate-200 pt-1 ${overBudget ? "text-red-600" : "text-slate-900"}`}>
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    {overBudget && <AlertTriangle className="h-3.5 w-3.5" />}
                    {fmtINR(total)}
                  </span>
                </div>
                {availableBalance !== null && (
                  <div className={`text-xs mt-1 flex justify-between ${overBudget ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                    <span>Balance available</span>
                    <span>{fmtINR(availableBalance)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Payment instructions, bank details…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => save(true)} disabled={saving || overBudget}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Save &amp; Send
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => save(false)} disabled={saving || overBudget}>
                <Save className="h-4 w-4 mr-2" />Save as Draft
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live preview ──────────────────────────────── */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live Preview</p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <InvoicePreview
                company={company}
                clientName={clientName}
                issueDate={issueDate}
                dueDate={dueDate}
                milestone={milestone}
                lineItems={lineItems}
                gstRate={gstRate}
                notes={notes}
                invoiceNum={invoice.invoiceNumber}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
