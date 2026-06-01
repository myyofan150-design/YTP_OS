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
import { Plus, Trash2, Loader2, ArrowLeft, Save, Send } from "lucide-react";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
}

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
  const subtotal  = lineItems.reduce((s, i) => s + calcItem(i), 0);
  const gstAmt    = subtotal * (parseFloat(gstRate) / 100 || 0);
  const total     = subtotal + gstAmt;
  const logoSrc   = resolveAssetUrl(company.company_logo_url);
  const orgName   = company.company_name || "Your Company";
  const tagline   = company.company_tagline || "";

  return (
    <div className="text-xs font-sans text-slate-800" style={{ lineHeight: 1.4 }}>
      <div className="rounded-t-lg p-5" style={{ background: "#1d4ed8" }}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {logoSrc && (
              <img
                src={logoSrc}
                alt={orgName}
                className="h-10 w-10 rounded-lg object-contain bg-white/10 p-0.5"
              />
            )}
            <div>
              <p className="text-xl font-bold text-white">{orgName}</p>
              {tagline && <p className="text-blue-200 text-[11px]">{tagline}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">INVOICE</p>
            <p className="text-blue-200 text-[11px] mt-1">{invoiceNum || "INV/YYYY/NNN"}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-slate-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Bill To</p>
          <p className="font-semibold text-slate-800">{clientName || "—"}</p>
        </div>
        <div className="text-right space-y-1">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Issue Date</p>
            <p className="font-medium">{fmtD(issueDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Due Date</p>
            <p className="font-medium">{fmtD(dueDate)}</p>
          </div>
        </div>
      </div>

      {milestone && (
        <div className="px-5 py-2 bg-indigo-50 border-b border-indigo-100">
          <p className="text-[10px] text-indigo-600 font-semibold uppercase">Milestone</p>
          <p className="text-slate-700">{milestone}</p>
        </div>
      )}

      <div className="px-5 py-3">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#1d4ed8" }} className="text-white">
              <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase rounded-tl">Description</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase w-12">Qty</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase w-20">Unit Price</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase rounded-tr w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.filter(i => i.description).map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                <td className="py-1.5 px-2 text-slate-700">{item.description}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.quantity || 1}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.unitPrice ? fmtINR(parseFloat(item.unitPrice)) : "—"}</td>
                <td className="py-1.5 px-2 text-right font-medium text-slate-800">{fmtINR(calcItem(item))}</td>
              </tr>
            ))}
            {lineItems.every(i => !i.description) && (
              <tr><td colSpan={4} className="py-4 text-center text-slate-300 italic">Add line items…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-3">
        <div className="border-t border-slate-200 pt-2 space-y-1 text-right">
          <div className="flex justify-end gap-12 text-slate-600">
            <span>Subtotal</span><span className="w-24">{fmtINR(subtotal)}</span>
          </div>
          {parseFloat(gstRate) > 0 && (
            <div className="flex justify-end gap-12 text-slate-600">
              <span>GST ({gstRate}%)</span><span className="w-24">{fmtINR(gstAmt)}</span>
            </div>
          )}
          <div className="flex justify-end gap-12 font-bold text-white rounded mt-1 py-1 px-2" style={{ background: "#1d4ed8" }}>
            <span>Total</span><span className="w-24">{fmtINR(total)}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="px-5 pb-3 border-t border-slate-100">
          <p className="text-[10px] uppercase font-semibold text-slate-400 mt-2 mb-1">Notes</p>
          <p className="text-slate-600">{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EditInvoicePage() {
  const router  = useRouter();
  const params  = useParams();
  const uuid    = String(params["uuid"]);

  const [invoice, setInvoice]     = useState<Invoice | null>(null);
  const [company, setCompany]     = useState<CompanySettings>({ company_name: null, company_tagline: null, company_email: null, company_logo_url: null });
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

  async function save(andSend: boolean) {
    setError("");
    const validItems = lineItems.filter(i => i.description && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) { setError("Add at least one line item with description and price"); return; }

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="text-sm text-gray-500">{invoice.invoiceNumber} · {clientName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Form ───────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Client (read-only) + Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Invoice Details</h2>

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
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                  <span>Total</span><span>{fmtINR(total)}</span>
                </div>
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
              <Button className="flex-1" onClick={() => save(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Save &amp; Send
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => save(false)} disabled={saving}>
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
