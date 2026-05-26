"use client";

// src/components/modules/clients/ClientModal.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { Camera, Plus, X, Pencil, Trash2, ChevronDown, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Client } from "@/types";

const STATUSES = [
  { value: "ACTIVE",    label: "Active" },
  { value: "INACTIVE",  label: "Inactive" },
  { value: "ON_HOLD",   label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CHURNED",   label: "Churned" },
];

const SOURCE_OPTS = ["Lead", "Manual", "Import"];

const EMPTY_FORM = {
  companyName: "", contactPerson: "", email: "", phone: "",
  whatsapp: "", website: "", clientTag: "", source: "Manual",
  address: "", gstNumber: "", country: "", city: "",
  status: "ACTIVE", contractType: "",
  totalContractValue: "",
  contractStart: "", contractEnd: "",
  notes: "", onHoldReason: "",
  nextFollowup: "", meetingDatetime: "",
};

interface MetaOption { id: number; uuid: string; type: string; label: string; color: string; }

interface Props {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

// Mini manager dialog for custom meta options (tags, contract types, or services)
function MetaManagerDialog({
  open, onClose, type, title, options, onRefresh,
}: {
  open: boolean; onClose: () => void;
  type: "tag" | "contract_type" | "service"; title: string;
  options: MetaOption[]; onRefresh: () => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await api.post("/clients/meta", { type, label: label.trim(), color });
      setLabel(""); setColor("#6366F1");
      onRefresh();
    } finally { setSaving(false); }
  }

  async function handleSaveEdit(uuid: string) {
    if (!editLabel.trim()) return;
    try {
      await api.patch(`/clients/meta/${uuid}`, { label: editLabel.trim() });
      setEditId(null); setEditLabel("");
      onRefresh();
    } catch {}
  }

  async function handleDelete(uuid: string) {
    if (!confirm("Delete this option?")) return;
    try {
      await api.delete(`/clients/meta/${uuid}`);
      onRefresh();
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Manage {title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {options.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No options yet.</p>}
            {options.map(opt => (
              <div key={opt.uuid} className="flex items-center gap-2 rounded border border-border p-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: opt.color }} />
                {editId === opt.uuid ? (
                  <>
                    <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="h-7 text-xs flex-1" autoFocus />
                    <button onClick={() => handleSaveEdit(opt.uuid)} className="text-xs text-primary font-medium">Save</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{opt.label}</span>
                    <button onClick={() => { setEditId(opt.uuid); setEditLabel(opt.label); }}
                      className="text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(opt.uuid)}
                      className="text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleAdd} className="flex gap-2 items-end border-t border-border pt-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">New {title}</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label…" className="h-8 text-sm" required />
            </div>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer" title="Color" />
            <Button type="submit" size="sm" disabled={saving} className="h-8 text-xs shrink-0">
              <Plus size={12} className="mr-1" />Add
            </Button>
          </form>
        </div>
        <DialogFooter><Button variant="outline" size="sm" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Searchable multi-select for services
function ServiceMultiSelect({
  options,
  selected,
  onChange,
  onManage,
}: {
  options: MetaOption[];
  selected: string[];
  onChange: (val: string[]) => void;
  onManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(label: string) {
    onChange(selected.includes(label) ? selected.filter(s => s !== label) : [...selected, label]);
  }

  function remove(label: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter(s => s !== label));
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full min-h-[38px] flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-left transition-colors ${
          open ? "border-primary ring-2 ring-primary/20" : "border-input hover:border-muted-foreground/40"
        } bg-background`}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted-foreground text-sm">Select services…</span>
          ) : (
            selected.map(svc => (
              <span
                key={svc}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-xs font-medium"
              >
                {svc}
                <span
                  role="button"
                  tabIndex={-1}
                  onMouseDown={e => remove(svc, e)}
                  className="ml-0.5 rounded-full hover:bg-indigo-200 cursor-pointer"
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={12} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search services…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Options */}
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground text-center">No services found</li>
            ) : (
              filtered.map(opt => {
                const active = selected.includes(opt.label);
                return (
                  <li key={opt.uuid}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.label)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                        active ? "bg-indigo-50 text-indigo-700" : "hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          active ? "bg-indigo-600 border-indigo-600" : "border-border"
                        }`}
                      >
                        {active && <Check size={10} className="text-white" />}
                      </span>
                      <span className="flex-1">{opt.label}</span>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: opt.color }} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer — manage link */}
          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(""); onManage(); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil size={10} /> Manage services
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClientModal({ client, open, onClose, onSaved }: Props) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [tags, setTags]         = useState<MetaOption[]>([]);
  const [contractTypes, setContractTypes] = useState<MetaOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<MetaOption[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [tagManagerOpen,      setTagManagerOpen]      = useState(false);
  const [ctManagerOpen,       setCtManagerOpen]       = useState(false);
  const [svcManagerOpen,      setSvcManagerOpen]      = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Today's date string for min restriction on date fields
  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await api.get<{ data: { tags: MetaOption[]; contractTypes: MetaOption[]; services: MetaOption[] } }>("/clients/meta");
      setTags(res.data.data.tags);
      setContractTypes(res.data.data.contractTypes);
      setServiceOptions(res.data.data.services ?? []);
    } catch {}
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (!open) return;
    fetchMeta();
    if (client) {
      setForm({
        companyName:        client.companyName ?? "",
        contactPerson:      client.contactPerson,
        email:              client.email              ?? "",
        phone:              client.phone              ?? "",
        whatsapp:           client.whatsapp           ?? "",
        website:            client.website            ?? "",
        clientTag:          client.clientTag          ?? "",
        source:             client.source             ?? "Manual",
        address:            client.address            ?? "",
        gstNumber:          client.gstNumber          ?? "",
        country:            client.country            ?? "",
        city:               client.city               ?? "",
        status:             client.status,
        contractType:       client.contractType       ?? "",
        totalContractValue: client.totalContractValue != null ? String(client.totalContractValue) : "",
        contractStart:      client.contractStart ? client.contractStart.slice(0, 10)          : "",
        contractEnd:        client.contractEnd   ? client.contractEnd.slice(0, 10)            : "",
        notes:              client.notes              ?? "",
        onHoldReason:       client.onHoldReason       ?? "",
        nextFollowup:       client.nextFollowup   ? client.nextFollowup.slice(0, 10)          : "",
        meetingDatetime:    client.meetingDatetime ? client.meetingDatetime.slice(0, 16)      : "",
      });
      setSelectedServices(
        Array.isArray(client.services)
          ? client.services
          : typeof client.services === "string"
            ? (() => { try { const p = JSON.parse(client.services as unknown as string); return Array.isArray(p) ? p : []; } catch { return []; } })()
            : []
      );
    } else {
      setForm(EMPTY_FORM);
      setSelectedServices([]);
    }
    setError("");
    setLogoFile(null);
    setLogoPreview(null);
  }, [client, open, fetchMeta]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    if (selectedServices.length === 0) {
      setError("At least one service must be selected"); return;
    }
    if (form.status === "ON_HOLD" && !form.onHoldReason.trim()) {
      setError("Reason for hold is required when status is On Hold"); return;
    }
    setLoading(true);
    try {
      const body = {
        companyName:        form.companyName || null,
        contactPerson:      form.contactPerson,
        email:              form.email              || null,
        phone:              form.phone              || null,
        whatsapp:           form.whatsapp           || null,
        website:            form.website            || null,
        clientTag:          form.clientTag          || null,
        source:             form.source             || "Manual",
        address:            form.address            || null,
        gstNumber:          form.gstNumber          || null,
        country:            form.country            || null,
        city:               form.city               || null,
        status:             form.status,
        contractType:       form.contractType       || "MONTHLY",
        totalContractValue: form.totalContractValue ? Number(form.totalContractValue) : null,
        contractStart:      form.contractStart      || null,
        contractEnd:        form.contractEnd        || null,
        notes:              form.notes              || null,
        onHoldReason:       form.status === "ON_HOLD" ? (form.onHoldReason || null) : null,
        nextFollowup:       form.nextFollowup       || null,
        meetingDatetime:    form.meetingDatetime    || null,
        services:           selectedServices,
      };
      let savedUuid = client?.uuid;
      if (client) {
        await api.patch(`/clients/${client.uuid}`, body);
      } else {
        const res = await api.post<{ data: { uuid: string } }>("/clients", body);
        savedUuid = res.data.data.uuid;
      }
      if (logoFile && savedUuid) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        await api.post(`/clients/${savedUuid}/logo`, fd);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save client"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              {client ? "Edit Client" : "Add New Client"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">

            {/* Basic Info */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Basic Info</p>

              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="relative w-14 h-14 rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all shrink-0 overflow-hidden group">
                  {logoPreview || resolveAssetUrl((client as (typeof client & { logoUrl?: string | null }) | null)?.logoUrl) ? (
                    <img src={logoPreview ?? resolveAssetUrl((client as (typeof client & { logoUrl?: string | null }) | null)?.logoUrl)!}
                      alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </span>
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Company Logo</p>
                  <p>Click to {client && (client as typeof client & { logoUrl?: string | null }).logoUrl ? "change" : "upload"} · JPG, PNG up to 2 MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <F label="Company Name">
                  <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} className="h-9 text-sm" placeholder="Optional" />
                </F>
                <F label="Contact Person" required>
                  <Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} required className="h-9 text-sm" />
                </F>
                <F label="Email">
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="Phone">
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="WhatsApp">
                  <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="+91…" className="h-9 text-sm" />
                </F>
                <F label="Website">
                  <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://…" className="h-9 text-sm" />
                </F>
                <F label="Address">
                  <Input value={form.address} onChange={e => set("address", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="GST Number">
                  <Input value={form.gstNumber} onChange={e => set("gstNumber", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="Country">
                  <Input value={form.country} onChange={e => set("country", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="City">
                  <Input value={form.city} onChange={e => set("city", e.target.value)} className="h-9 text-sm" />
                </F>

                {/* Client Tag — custom user-defined */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">Client Tag</Label>
                    <button type="button" onClick={() => setTagManagerOpen(true)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                      <Pencil size={9} />Manage
                    </button>
                  </div>
                  <Select value={form.clientTag || "_none"} onValueChange={v => set("clientTag", v === "_none" ? "" : (v ?? ""))}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {tags.map(t => (
                        <SelectItem key={t.uuid} value={t.label}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <F label="Source">
                  <Select value={form.source} onValueChange={v => set("source", v ?? "Manual")}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
              </div>

              {/* Services multi-select */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-slate-700">
                  Services <span className="text-red-500">*</span>
                </Label>
                <ServiceMultiSelect
                  options={serviceOptions}
                  selected={selectedServices}
                  onChange={setSelectedServices}
                  onManage={() => setSvcManagerOpen(true)}
                />
                {selectedServices.length === 0 && (
                  <p className="text-[10px] text-red-500">Select at least one service</p>
                )}
              </div>
            </section>

            {/* Contract */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Contract</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Status">
                  <Select value={form.status} onValueChange={v => set("status", v ?? "ACTIVE")}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>

                {/* Contract Type — custom user-defined */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-700">Contract Type</Label>
                    <button type="button" onClick={() => setCtManagerOpen(true)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                      <Pencil size={9} />Manage
                    </button>
                  </div>
                  <Select value={form.contractType || "_none"} onValueChange={v => set("contractType", v === "_none" ? "" : (v ?? ""))}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Select…</SelectItem>
                      {contractTypes.map(ct => (
                        <SelectItem key={ct.uuid} value={ct.label}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: ct.color }} />
                            {ct.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <F label="Total Contract Value (₹)">
                  <Input type="number" min="0" step="0.01" value={form.totalContractValue} onChange={e => set("totalContractValue", e.target.value)} className="h-9 text-sm" />
                </F>
                <div />
                <F label="Contract Start">
                  <Input type="date" value={form.contractStart} onChange={e => set("contractStart", e.target.value)} className="h-9 text-sm" />
                </F>
                <F label="Contract End">
                  <Input type="date" value={form.contractEnd} onChange={e => set("contractEnd", e.target.value)} className="h-9 text-sm" />
                </F>
              </div>
              {form.status === "ON_HOLD" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Reason for hold <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={form.onHoldReason}
                    onChange={e => set("onHoldReason", e.target.value)}
                    rows={2}
                    placeholder="Explain why this client is on hold…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Notes</Label>
                <textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </section>

            {/* Tracking */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Tracking</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Next Follow-up">
                  <Input type="date" min={todayStr} value={form.nextFollowup} onChange={e => set("nextFollowup", e.target.value)} className="h-9 text-sm" />
                </F>
                <div className="space-y-1">
                  <F label="Meeting Date & Time">
                    <Input type="datetime-local" min={`${todayStr}T00:00`} value={form.meetingDatetime} onChange={e => set("meetingDatetime", e.target.value)} className="h-9 text-sm" />
                  </F>
                  <p className="text-xs text-slate-400">Google Calendar integration coming soon</p>
                </div>
              </div>
            </section>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">{error}</p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
              <Button type="submit" disabled={loading} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
                {loading ? "Saving…" : client ? "Save Changes" : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MetaManagerDialog
        open={tagManagerOpen} onClose={() => setTagManagerOpen(false)}
        type="tag" title="Tags" options={tags} onRefresh={fetchMeta}
      />
      <MetaManagerDialog
        open={ctManagerOpen} onClose={() => setCtManagerOpen(false)}
        type="contract_type" title="Contract Types" options={contractTypes} onRefresh={fetchMeta}
      />
      <MetaManagerDialog
        open={svcManagerOpen} onClose={() => setSvcManagerOpen(false)}
        type="service" title="Services" options={serviceOptions} onRefresh={fetchMeta}
      />
    </>
  );
}
