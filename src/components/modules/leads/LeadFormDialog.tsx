"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { ChevronDown, Check, Search, X } from "lucide-react";
import type { ApiResponse, Lead, LeadMetaOption, User } from "@/types";
import type { LeadMetaGroups } from "@/hooks/useLeads";

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  contactPerson:          string;
  companyName:            string;
  email:                  string;
  phone:                  string;
  whatsapp:               string;
  industry:               string;
  country:                string;
  city:                   string;
  website:                string;
  sourceId:               string;
  statusId:               string;
  priorityId:             string;
  assignedTo:             string;
  budgetMin:              string;
  budgetMax:              string;
  timeline:               string;
  lastContacted:          string;
  nextFollowup:           string;
  meetingDatetime:        string;
  requirementDescription: string;
  serviceIds:             number[];
}

const EMPTY: FormState = {
  contactPerson: "", companyName: "", email: "", phone: "", whatsapp: "",
  industry: "", country: "", city: "", website: "",
  sourceId: "", statusId: "", priorityId: "", assignedTo: "",
  budgetMin: "", budgetMax: "",
  timeline: "", lastContacted: "", nextFollowup: "", meetingDatetime: "",
  requirementDescription: "", serviceIds: [],
};

function safeSlice(d: string | null | undefined, len: number): string {
  if (!d) return "";
  // Handle "YYYY-MM-DD HH:MM:SS" format from DB with dateStrings:true
  return d.replace(" ", "T").slice(0, len);
}

function leadToForm(lead: Lead): FormState {
  return {
    contactPerson:  lead.contactPerson,
    companyName:    lead.companyName   ?? "",
    email:          lead.email         ?? "",
    phone:          lead.phone         ?? "",
    whatsapp:       lead.whatsapp      ?? "",
    industry:       lead.industry      ?? "",
    country:        lead.country       ?? "",
    city:           lead.city          ?? "",
    website:        lead.website       ?? "",
    sourceId:       lead.sourceId   != null ? String(lead.sourceId)   : "",
    statusId:       lead.statusId   != null ? String(lead.statusId)   : "",
    priorityId:     lead.priorityId != null ? String(lead.priorityId) : "",
    assignedTo:     lead.assignedTo != null ? String(lead.assignedTo) : "",
    budgetMin:      lead.budgetMin  != null ? String(lead.budgetMin)  : "",
    budgetMax:      lead.budgetMax  != null ? String(lead.budgetMax)  : "",
    timeline:       safeSlice(lead.timeline, 10),
    lastContacted:  safeSlice(lead.lastContacted, 10),
    nextFollowup:   safeSlice(lead.nextFollowup, 10),
    meetingDatetime: safeSlice(lead.meetingDatetime, 16),
    requirementDescription: lead.requirementDescription ?? "",
    serviceIds: lead.services.map(s => s.id),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSaved:  () => void;
  editUuid: string | null;
  meta:     LeadMetaGroups;
}

// ─── ServiceMultiSelect ───────────────────────────────────────────────────────

function ServiceMultiSelect({
  services,
  selected,
  onChange,
}: {
  services:  LeadMetaOption[];
  selected:  number[];
  onChange:  (ids: number[]) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = services.filter(s => s.label.toLowerCase().includes(query.toLowerCase()));

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  function remove(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter(x => x !== id));
  }

  const selectedServices = services.filter(s => selected.includes(s.id));

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-left transition-colors ${
          open ? "border-primary ring-2 ring-primary/20" : "border-input hover:border-muted-foreground/40"
        } bg-background`}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selectedServices.length === 0 ? (
            <span className="text-muted-foreground text-sm">Select services…</span>
          ) : (
            selectedServices.map(svc => (
              <span
                key={svc.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: `${svc.color}18`, color: svc.color, border: `1px solid ${svc.color}33` }}
              >
                {svc.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onMouseDown={e => remove(svc.id, e)}
                  className="ml-0.5 rounded-full hover:opacity-70 cursor-pointer"
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
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground text-center">No services found</li>
            ) : (
              filtered.map(svc => {
                const active = selected.includes(svc.id);
                return (
                  <li key={svc.id}>
                    <button
                      type="button"
                      onClick={() => toggle(svc.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                        active ? "bg-primary/8 text-primary" : "hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        active ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {active && <Check size={10} className="text-primary-foreground" />}
                      </span>
                      <span className="flex-1">{svc.label}</span>
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: svc.color }} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── LeadFormDialog ───────────────────────────────────────────────────────────

export function LeadFormDialog({ open, onClose, onSaved, editUuid, meta }: Props) {
  const { user: authUser } = useAuthStore();
  const isEmployee = authUser?.role === "EMPLOYEE";

  const [form, setForm]             = useState<FormState>(EMPTY);
  const [users, setUsers]           = useState<User[]>([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editorKey, setEditorKey]   = useState(0);

  const MAX_BUDGET = 9_999_999_999;

  function validateBudget(min: string, max: string): string {
    const bMin = min && Number(min) !== 0 ? Math.floor(Number(min)) : null;
    const bMax = max && Number(max) !== 0 ? Math.floor(Number(max)) : null;
    if (bMin !== null && bMin < 1)          return "Budget must be greater than zero";
    if (bMax !== null && bMax < 1)          return "Budget must be greater than zero";
    if (bMin !== null && bMin > MAX_BUDGET) return "Budget value is too large";
    if (bMax !== null && bMax > MAX_BUDGET) return "Budget value is too large";
    if (bMin !== null && bMax !== null && bMin > bMax) return "Min cannot exceed Max";
    return "";
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const loadEdit = useCallback(async (uuid: string) => {
    setLoadingEdit(true);
    try {
      const res = await api.get<ApiResponse<Lead>>(`/leads/${uuid}`);
      setForm(leadToForm(res.data.data));
      setEditorKey(k => k + 1);
    } catch {
      setError("Failed to load lead");
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (!isEmployee) {
      api.get<ApiResponse<User[]>>("/users", { params: { status: "ACTIVE" } })
        .then(r => setUsers(r.data.data)).catch(() => {});
    }
    if (editUuid) {
      loadEdit(editUuid);
    } else {
      setForm(EMPTY);
      setEditorKey(k => k + 1);
    }
  }, [open, editUuid, isEmployee, loadEdit]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.contactPerson.trim()) { setError("Contact person is required"); return; }
    const bErr = validateBudget(form.budgetMin, form.budgetMax);
    if (bErr) { setBudgetError(bErr); return; }
    setBudgetError("");
    setSaving(true); setError("");
    try {
      const body = {
        contactPerson:          form.contactPerson.trim(),
        companyName:            form.companyName.trim()   || null,
        email:                  form.email.trim()          || null,
        phone:                  form.phone.trim()          || null,
        whatsapp:               form.whatsapp.trim()       || null,
        industry:               form.industry.trim()       || null,
        country:                form.country.trim()        || null,
        city:                   form.city.trim()           || null,
        website:                form.website.trim()        || null,
        sourceId:               form.sourceId   ? Number(form.sourceId)   : null,
        statusId:               form.statusId   ? Number(form.statusId)   : null,
        priorityId:             form.priorityId ? Number(form.priorityId) : null,
        assignedTo:             form.assignedTo ? Number(form.assignedTo) : null,
        budgetMin:              form.budgetMin && Number(form.budgetMin) !== 0 ? Math.floor(Number(form.budgetMin)) : null,
        budgetMax:              form.budgetMax && Number(form.budgetMax) !== 0 ? Math.floor(Number(form.budgetMax)) : null,
        timeline:               form.timeline        || null,
        lastContacted:          form.lastContacted   || null,
        nextFollowup:           form.nextFollowup    || null,
        meetingDatetime:        form.meetingDatetime || null,
        requirementDescription: form.requirementDescription || null,
        serviceIds:             form.serviceIds,
      };
      if (editUuid) {
        await api.patch(`/leads/${editUuid}`, body);
        toast.success("Lead updated");
      } else {
        await api.post("/leads", body);
        toast.success("Lead created");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editUuid ? "Edit Lead" : "New Lead"}</DialogTitle>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <F label="Contact Person" required>
                <Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} className="h-8 text-sm" autoFocus />
              </F>
              <F label="Company Name">
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Email">
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Phone">
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="WhatsApp">
                <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="+91..." className="h-8 text-sm" />
              </F>
              <F label="Website">
                <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://…" className="h-8 text-sm" />
              </F>
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-3">
              <F label="Industry">
                <Input value={form.industry} onChange={e => set("industry", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Country">
                <Input value={form.country} onChange={e => set("country", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="City">
                <Input value={form.city} onChange={e => set("city", e.target.value)} className="h-8 text-sm" />
              </F>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <F label="Status">
                {(() => {
                  const sel = meta.statuses.find(s => String(s.id) === form.statusId);
                  return (
                    <Select value={form.statusId} onValueChange={v => set("statusId", v ?? "")}>
                      <SelectTrigger className="h-8 text-sm w-full">
                        <span className="flex items-center gap-1.5 truncate min-w-0">
                          {sel && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: sel.color }} />}
                          <span className="truncate" style={{ color: sel ? "inherit" : "var(--text-secondary)" }}>
                            {sel ? sel.label : "None"}
                          </span>
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                        {meta.statuses.map(s => (
                          <SelectItem key={s.uuid} value={String(s.id)}>
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </F>
              <F label="Priority">
                {(() => {
                  const sel = meta.priorities.find(p => String(p.id) === form.priorityId);
                  return (
                    <Select value={form.priorityId} onValueChange={v => set("priorityId", v ?? "")}>
                      <SelectTrigger className="h-8 text-sm w-full">
                        <span className="flex items-center gap-1.5 truncate min-w-0">
                          {sel && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: sel.color }} />}
                          <span className="truncate" style={{ color: sel ? "inherit" : "var(--text-secondary)" }}>
                            {sel ? sel.label : "None"}
                          </span>
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                        {meta.priorities.map(p => (
                          <SelectItem key={p.uuid} value={String(p.id)}>
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />{p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </F>
              <F label="Source">
                {(() => {
                  const sel = meta.sources.find(s => String(s.id) === form.sourceId);
                  return (
                    <Select value={form.sourceId} onValueChange={v => set("sourceId", v ?? "")}>
                      <SelectTrigger className="h-8 text-sm w-full">
                        <span className="flex items-center gap-1.5 truncate min-w-0">
                          {sel && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: sel.color }} />}
                          <span className="truncate" style={{ color: sel ? "inherit" : "var(--text-secondary)" }}>
                            {sel ? sel.label : "None"}
                          </span>
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                        {meta.sources.map(s => (
                          <SelectItem key={s.uuid} value={String(s.id)}>
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </F>
              {!isEmployee && (
                <F label="Assigned To">
                  {(() => {
                    const sel = users.find(u => String(u.id) === form.assignedTo);
                    return (
                      <Select value={form.assignedTo} onValueChange={v => set("assignedTo", v ?? "")}>
                        <SelectTrigger className="h-8 text-sm w-full">
                          <span className="truncate" style={{ color: sel ? "inherit" : "var(--text-secondary)" }}>
                            {sel ? sel.name : "Unassigned"}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>Unassigned</span></SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </F>
              )}
            </div>

            {/* Services */}
            <F label="Services">
              <ServiceMultiSelect
                services={meta.services}
                selected={form.serviceIds}
                onChange={ids => set("serviceIds", ids)}
              />
            </F>

            {/* Budget */}
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-3">
                <F label="Budget Min (₹)">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.budgetMin}
                    onChange={e => { set("budgetMin", e.target.value); setBudgetError(""); }}
                    onBlur={() => setBudgetError(validateBudget(form.budgetMin, form.budgetMax))}
                    className={`h-8 text-sm ${budgetError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    placeholder="e.g. 10000"
                  />
                </F>
                <F label="Budget Max (₹)">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.budgetMax}
                    onChange={e => { set("budgetMax", e.target.value); setBudgetError(""); }}
                    onBlur={() => setBudgetError(validateBudget(form.budgetMin, form.budgetMax))}
                    className={`h-8 text-sm ${budgetError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    placeholder="e.g. 50000"
                  />
                </F>
              </div>
              {budgetError && (
                <p className="text-xs text-red-500 mt-1">{budgetError}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <F label="Timeline">
                <Input type="date" value={form.timeline} onChange={e => set("timeline", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Next Follow-up">
                <Input type="date" value={form.nextFollowup} onChange={e => set("nextFollowup", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Last Contacted">
                <Input type="date" value={form.lastContacted} onChange={e => set("lastContacted", e.target.value)} className="h-8 text-sm" />
              </F>
              <F label="Meeting Date & Time">
                <Input type="datetime-local" value={form.meetingDatetime} onChange={e => set("meetingDatetime", e.target.value)} className="h-8 text-sm" />
              </F>
            </div>

            {/* Requirement */}
            <F label="Requirement Description">
              <RichTextEditor
                key={`rte-${editorKey}`}
                value={form.requirementDescription}
                onChange={v => set("requirementDescription", v)}
                editable
              />
            </F>

            {error && (
              <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : editUuid ? "Save Changes" : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
