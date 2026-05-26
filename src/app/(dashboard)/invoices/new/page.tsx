"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Client } from "@/types";

interface CompanySettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, ArrowLeft, Send, Save, Search, ChevronDown } from "lucide-react";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface Balance {
  totalContractValue: number | null;
  totalInvoiced: number;
  balance: number | null;
}

function calcItem(item: LineItem) {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function ClientAvatar({ client }: { client: Client }) {
  const apiBase = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000/api").replace("/api", "");
  if (client.logoUrl) {
    return (
      <img
        src={`${apiBase}/${client.logoUrl}`}
        alt={client.companyName ?? ""}
        className="h-6 w-6 rounded-full object-cover border border-slate-200"
      />
    );
  }
  const colors = ["bg-indigo-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-purple-500"];
  const name = client.companyName ?? client.contactPerson;
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <span className={`h-6 w-6 rounded-full ${color} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
      {initials(name)}
    </span>
  );
}

// ── Searchable client dropdown ─────────────────────────────────────────────────
function ClientSelect({
  clients, selectedId, onSelect,
}: { clients: Client[]; selectedId: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = clients.find(c => String(c.id) === selectedId);

  const filtered = query
    ? clients.filter(c => (c.companyName ?? c.contactPerson).toLowerCase().includes(query.toLowerCase()))
    : clients;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(""); }}
        className="w-full flex items-center gap-2 h-10 rounded-md border border-input bg-background px-3 text-sm text-left"
      >
        {selected ? (
          <>
            <ClientAvatar client={selected} />
            <span className="truncate">{selected.companyName}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Select a client…</span>
        )}
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-white shadow-lg">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
            ) : filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onSelect(String(c.id)); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${String(c.id) === selectedId ? "bg-indigo-50" : ""}`}
              >
                <ClientAvatar client={c} />
                <span className="truncate">{c.companyName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live invoice preview ───────────────────────────────────────────────────────
function InvoicePreview({
  company, client, issueDate, dueDate, milestone, lineItems, gstRate, notes, invoiceNum,
}: {
  company: CompanySettings;
  client: Client | undefined;
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
  const fmtD      = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const apiBase   = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000/api").replace("/api", "");
  const logoSrc   = company.company_logo_url ? `${apiBase}/${company.company_logo_url}` : null;
  const orgName   = company.company_name || "Your Company";
  const tagline   = company.company_tagline || "";

  return (
    <div className="text-xs font-sans text-slate-800" style={{ lineHeight: 1.4 }}>
      {/* Header */}
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

      {/* Meta */}
      <div className="px-5 py-4 border-b border-slate-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Bill To</p>
          {client ? (
            <>
              <p className="font-semibold text-slate-800">{client.companyName}</p>
              <p className="text-slate-500">{client.contactPerson}</p>
              {client.address && <p className="text-slate-400 text-[11px]">{client.address}</p>}
              {client.gstNumber && <p className="text-slate-400 text-[11px]">GSTIN: {client.gstNumber}</p>}
            </>
          ) : (
            <p className="text-slate-300 italic">No client selected</p>
          )}
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

      {/* Milestone */}
      {milestone && (
        <div className="px-5 py-2 bg-indigo-50 border-b border-indigo-100">
          <p className="text-[10px] text-indigo-600 font-semibold uppercase">Milestone</p>
          <p className="text-slate-700">{milestone}</p>
        </div>
      )}

      {/* Line items table */}
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

      {/* Totals */}
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

      {/* Notes */}
      {notes && (
        <div className="px-5 pb-3 border-t border-slate-100">
          <p className="text-[10px] uppercase font-semibold text-slate-400 mt-2 mb-1">Notes</p>
          <p className="text-slate-600">{notes}</p>
        </div>
      )}

      {/* T&C preview */}
      <div className="px-5 pb-4 border-t border-slate-100">
        <p className="text-[10px] uppercase font-semibold text-slate-400 mt-2 mb-1">Terms &amp; Conditions</p>
        <p className="text-[10px] text-slate-400">Payment due within 30 days · Late payments subject to 2% monthly interest · PDF contains full terms.</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients]       = useState<Client[]>([]);
  const [clientId, setClientId]     = useState(() => searchParams.get("clientId") ?? "");
  const [address, setAddress]       = useState("");
  const [issueDate, setIssueDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]       = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [gstRate, setGstRate]       = useState("18");
  const [milestone, setMilestone]   = useState("");
  const [notes, setNotes]           = useState("");
  const [lineItems, setLineItems]   = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [balance, setBalance]       = useState<Balance | null>(null);
  const [company, setCompany]       = useState<CompanySettings>({ company_name: null, company_tagline: null, company_email: null, company_logo_url: null });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const selectedClient = clients.find(c => String(c.id) === clientId);

  useEffect(() => {
    api.get("/clients", { params: { limit: 500, status: "ACTIVE" } })
       .then(r => setClients(r.data.data?.clients ?? r.data.data ?? []))
       .catch(() => {});
    api.get<{ data: CompanySettings }>("/settings/general")
       .then(r => setCompany(r.data.data))
       .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) { setBalance(null); return; }
    const client = clients.find(c => String(c.id) === clientId);
    if (client?.address) setAddress(client.address);
    api.get<{ data: Balance }>(`/invoices/client-balance/${clientId}`)
       .then(r => setBalance(r.data.data))
       .catch(() => setBalance(null));
  }, [clientId, clients]);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setLineItems(prev => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  const subtotal  = lineItems.reduce((s, i) => s + calcItem(i), 0);
  const gstAmt    = subtotal * (parseFloat(gstRate) / 100 || 0);
  const total     = subtotal + gstAmt;

  const balanceExceeded = balance?.balance != null && subtotal > balance.balance;

  async function submit(sendEmail: boolean) {
    setError("");
    if (!clientId) { setError("Please select a client"); return; }
    const validItems = lineItems.filter(i => i.description && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) { setError("Add at least one line item with description and price"); return; }
    if (balanceExceeded) { setError(`Line items total (${fmtINR(subtotal)}) exceeds available balance (${fmtINR(balance!.balance!)})`); return; }

    setSaving(true);
    try {
      await api.post("/invoices", {
        clientId:  parseInt(clientId),
        issueDate,
        dueDate,
        gstRate:   parseFloat(gstRate) || 0,
        milestone: milestone || undefined,
        notes:     notes || undefined,
        lineItems: validItems.map(i => ({
          description: i.description,
          quantity:    parseFloat(i.quantity) || 1,
          unitPrice:   parseFloat(i.unitPrice),
        })),
        sendEmail,
      });
      router.push("/invoices");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-sm text-gray-500">Create a new client invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Form ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Client + Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Invoice Details</h2>

            <div>
              <Label>Client *</Label>
              <ClientSelect clients={clients} selectedId={clientId} onSelect={setClientId} />
            </div>

            {/* Balance info */}
            {balance && (
              <div className={`rounded-lg border p-3 text-sm ${balanceExceeded ? "border-red-200 bg-red-50" : "border-indigo-100 bg-indigo-50/50"}`}>
                <div className="flex gap-6 flex-wrap">
                  {balance.totalContractValue != null && (
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-500">Contract Value</p>
                      <p className="font-semibold text-slate-800">{fmtINR(balance.totalContractValue)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Already Invoiced</p>
                    <p className="font-semibold text-slate-800">{fmtINR(balance.totalInvoiced)}</p>
                  </div>
                  {balance.balance != null && (
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-500">Available Balance</p>
                      <p className={`font-bold ${balance.balance <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {fmtINR(balance.balance)}
                      </p>
                    </div>
                  )}
                </div>
                {balanceExceeded && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">
                    Line items total ({fmtINR(subtotal)}) exceeds available balance
                  </p>
                )}
              </div>
            )}

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

            {selectedClient && (
              <div>
                <Label>Client Address</Label>
                <Textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Auto-filled from client record"
                  className="text-sm"
                />
              </div>
            )}
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
              <Button className="flex-1" onClick={() => submit(true)} disabled={saving || balanceExceeded}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Save &amp; Send
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => submit(false)} disabled={saving || balanceExceeded}>
                <Save className="h-4 w-4 mr-2" />Save as Draft
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live preview ─────────────────────────────── */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live Preview</p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <InvoicePreview
                company={company}
                client={selectedClient}
                issueDate={issueDate}
                dueDate={dueDate}
                milestone={milestone}
                lineItems={lineItems}
                gstRate={gstRate}
                notes={notes}
                invoiceNum=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
