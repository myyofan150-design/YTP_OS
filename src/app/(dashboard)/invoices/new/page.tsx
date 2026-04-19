"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Client } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, ArrowLeft, Send, Save } from "lucide-react";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

function calcItem(item: LineItem) {
  const q = parseFloat(item.quantity) || 0;
  const p = parseFloat(item.unitPrice) || 0;
  return q * p;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients]     = useState<Client[]>([]);
  const [clientId, setClientId]   = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [gstRate, setGstRate]     = useState("18");
  const [notes, setNotes]         = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.get("/clients", { params: { limit: 200, status: "ACTIVE" } })
       .then(r => setClients(r.data.data.clients ?? r.data.data))
       .catch(() => {});
  }, []);

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

  async function submit(sendEmail: boolean) {
    if (!clientId) { alert("Please select a client"); return; }
    const validItems = lineItems.filter(i => i.description && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) { alert("Add at least one line item with description and price"); return; }

    setSaving(true);
    try {
      await api.post("/invoices", {
        clientId:  parseInt(clientId),
        issueDate,
        dueDate,
        gstRate:   parseFloat(gstRate) || 0,
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create invoice";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Client + Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Invoice Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Client *</Label>
                <Select value={clientId || "_none"} onValueChange={(v: string | null) => setClientId(v === "_none" || !v ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Select a client</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issue Date *</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Line Items</h2>

            {/* Header */}
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
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(i, "quantity", e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="₹ Price"
                    value={item.unitPrice}
                    onChange={e => updateItem(i, "unitPrice", e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 text-right text-sm font-medium text-gray-700">
                  ₹{calcItem(item).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <button
                      onClick={() => removeItem(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
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

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Notes</h2>
            <Textarea
              placeholder="Payment instructions, bank details, or any other notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 sticky top-6">
            <h2 className="font-semibold text-gray-800">Summary</h2>

            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={gstRate}
                onChange={e => setGstRate(e.target.value)}
              />
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(gstRate) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>GST ({gstRate}%)</span>
                  <span>₹{gstAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full"
                onClick={() => submit(true)}
                disabled={saving}
              >
                {saving
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Send className="h-4 w-4 mr-2" />
                }
                Save &amp; Send
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => submit(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
