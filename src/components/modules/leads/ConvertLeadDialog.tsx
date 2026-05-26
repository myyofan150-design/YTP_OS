"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import api from "@/lib/api";
import type { Lead } from "@/types";

interface Props {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConverted: () => void;
}

interface Form {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  country: string;
  city: string;
}

function empty(lead: Lead | null): Form {
  return {
    companyName:   lead?.companyName   ?? "",
    contactPerson: lead?.contactPerson ?? "",
    email:         lead?.email         ?? "",
    phone:         lead?.phone         ?? "",
    industry:      lead?.industry      ?? "",
    country:       lead?.country       ?? "",
    city:          lead?.city          ?? "",
  };
}

export function ConvertLeadDialog({ open, lead, onClose, onConverted }: Props) {
  const [form, setForm]       = useState<Form>(empty(lead));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { if (open) { setForm(empty(lead)); setError(""); } }, [open, lead]);

  function set(field: keyof Form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!lead) return;
    if (!form.companyName.trim())   { setError("Company name is required"); return; }
    if (!form.contactPerson.trim()) { setError("Contact person is required"); return; }

    setSaving(true); setError("");
    try {
      const res = await api.post<{ data: { clientUuid: string } }>(
        `/leads/${lead.uuid}/convert`,
        {
          companyName:   form.companyName.trim(),
          contactPerson: form.contactPerson.trim(),
          email:         form.email.trim()   || null,
          phone:         form.phone.trim()   || null,
          industry:      form.industry.trim() || null,
          country:       form.country.trim()  || null,
          city:          form.city.trim()     || null,
        }
      );
      const clientUuid = res.data.data.clientUuid;
      toast.success("Lead converted!", {
        description: "A new Client record has been created.",
        action: {
          label: "View Client →",
          onClick: () => window.open(`/clients/${clientUuid}`, "_blank"),
        },
        duration: 6000,
      });
      onConverted();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Conversion failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink size={16} />Convert to Client
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)", borderLeft: "3px solid var(--accent)" }}>
          This will create a new <strong>Client</strong> record and link it to this lead.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name <span style={{ color: "#EF4444" }}>*</span></Label>
              <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person <span style={{ color: "#EF4444" }}>*</span></Label>
              <Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Input value={form.industry} onChange={e => set("industry", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={form.country} onChange={e => set("country", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          {error && (
            <p className="text-xs rounded px-2 py-1.5" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Converting…" : "Convert to Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
