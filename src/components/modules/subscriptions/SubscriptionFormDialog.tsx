"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ApiResponse, MetaOption, Subscription } from "@/types";
import { DropZone } from "@/components/ui/drop-zone";
import { resolveAssetUrl as toFullUrl } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  logoUrl: string;
  link: string;
  username: string;
  password: string;
  startDate: string;
  endDate: string;
  categoryId: string;
  billingCycleId: string;
  statusId: string;
  price: string;
  nextRenewalAmount: string;
  currency: string;
  autopay: boolean;
  planTier: string;
  usageType: string;
  remarks: string;
}

const EMPTY: FormState = {
  name: "", logoUrl: "", link: "", username: "", password: "",
  startDate: "", endDate: "",
  categoryId: "", billingCycleId: "", statusId: "",
  price: "", nextRenewalAmount: "", currency: "INR", autopay: false,
  planTier: "", usageType: "", remarks: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editUuid: string | null;
  categories: MetaOption[];
  billingCycles: MetaOption[];
  statuses: MetaOption[];
}

// ─── Autopay Toggle ───────────────────────────────────────────────────────────

function AutopayToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none"
      style={{ background: value ? "#22C55E" : "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ─── SubscriptionFormDialog ───────────────────────────────────────────────────

export function SubscriptionFormDialog({
  open, onClose, onSaved, editUuid, categories, billingCycles, statuses,
}: Props) {
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editorKey, setEditorKey]     = useState(0);
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Load subscription data when editing
  const loadEdit = useCallback(async (uuid: string) => {
    setLoadingEdit(true);
    try {
      const res = await api.get<ApiResponse<Subscription & { password?: string | null }>>(`/subscriptions/${uuid}`);
      const s = res.data.data;
      setForm({
        name:          s.name,
        logoUrl:       s.logoUrl  ?? "",
        link:          s.link     ?? "",
        username:      s.username ?? "",
        password:      s.password ?? "",
        startDate:     s.startDate?.slice(0, 10) ?? "",
        endDate:       s.endDate?.slice(0, 10)   ?? "",
        categoryId:    s.category     ? String(s.category.id)     : "",
        billingCycleId: s.billingCycle ? String(s.billingCycle.id) : "",
        statusId:      s.status       ? String(s.status.id)       : "",
        price:             s.price             != null ? String(s.price)             : "",
        nextRenewalAmount: s.nextRenewalAmount != null ? String(s.nextRenewalAmount) : "",
        currency:      s.currency ?? "INR",
        autopay:       s.autopay,
        planTier:      s.planTier  ?? "",
        usageType:     s.usageType ?? "",
        remarks:       s.remarks ?? "",
      });
      setEditorKey(k => k + 1);
    } catch {
      setError("Failed to load subscription data");
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setShowPw(false);
    setLogoFile(null);
    setLogoPreview(null);
    if (editUuid) {
      loadEdit(editUuid);
    } else {
      setForm(EMPTY);
      setEditorKey(k => k + 1);
    }
  }, [open, editUuid, loadEdit]);

  // Duration display
  const duration =
    form.startDate && form.endDate
      ? Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86_400_000)
      : null;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError("Name, Start Date and End Date are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name:          form.name.trim(),
        logoUrl:       form.logoUrl       || null,
        link:          form.link          || null,
        username:      form.username      || null,
        password:      form.password      || null,
        startDate:     form.startDate,
        endDate:       form.endDate,
        categoryId:    form.categoryId    ? Number(form.categoryId)    : null,
        billingCycleId: form.billingCycleId ? Number(form.billingCycleId) : null,
        statusId:      form.statusId      ? Number(form.statusId)      : null,
        price:             form.price             ? Number(form.price)             : null,
        nextRenewalAmount: form.nextRenewalAmount ? Number(form.nextRenewalAmount) : null,
        currency:      form.currency,
        autopay:       form.autopay,
        planTier:      form.planTier  || null,
        usageType:     form.usageType || null,
        remarks:       form.remarks       || null,
      };
      let uuid = editUuid;
      if (editUuid) {
        await api.patch(`/subscriptions/${editUuid}`, body);
      } else {
        const res = await api.post<{ data: { uuid: string } }>("/subscriptions", body);
        uuid = res.data?.data?.uuid ?? null;
      }
      if (logoFile && uuid) {
        try {
          const fd = new FormData();
          fd.append("logo", logoFile);
          await api.post(`/subscriptions/${uuid}/logo`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (_e) {
          // logo upload failed — subscription still saved successfully
        }
      }
      toast.success(editUuid ? "Subscription updated" : "Subscription created");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

  const selectedCategory     = categories.find(c => String(c.id) === form.categoryId);
  const selectedStatus       = statuses.find(s => String(s.id) === form.statusId);
  const selectedBillingCycle = billingCycles.find(b => String(b.id) === form.billingCycleId);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editUuid ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">

            {/* Row 1: Name + Logo URL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} required className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Logo</Label>
                <DropZone
                  accept="image/*"
                  imagePreview
                  previewUrl={logoPreview ?? toFullUrl(form.logoUrl)}
                  onClear={() => { setLogoFile(null); setLogoPreview(null); set("logoUrl", ""); }}
                  label="Upload logo"
                  hint="PNG, JPG, SVG · max 5 MB"
                  className="h-[72px]"
                  onFile={file => {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }}
                />
              </div>
            </div>

            {/* Row 2: Link + Username */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Link</Label>
                <Input value={form.link} onChange={e => set("link", e.target.value)} className="h-8 text-sm" placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Username</Label>
                <Input value={form.username} onChange={e => set("username", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Row 3: Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  className="h-8 text-sm pr-8"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Row 4: Dates + Duration */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Date *</Label>
                  <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} required className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Date *</Label>
                  <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} required className="h-8 text-sm" />
                </div>
              </div>
              {duration !== null && (
                <p className="text-xs" style={{ color: duration < 0 ? "#EF4444" : "var(--text-secondary)" }}>
                  Duration: <strong>{Math.abs(duration)} days</strong>
                  {duration < 0 ? " (end date is before start date)" : ""}
                </p>
              )}
            </div>

            {/* Row 5: Category + Status + Billing Cycle */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.categoryId} onValueChange={v => set("categoryId", v ?? "")}>
                  <SelectTrigger className="h-8 text-sm w-full">
                    <span className="flex items-center gap-1.5 truncate">
                      {selectedCategory ? (
                        <>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: selectedCategory.color }} />
                          <span className="truncate">{selectedCategory.label}</span>
                        </>
                      ) : <span style={{ color: "var(--text-secondary)" }}>None</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.uuid} value={String(c.id)}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.statusId} onValueChange={v => set("statusId", v ?? "")}>
                  <SelectTrigger className="h-8 text-sm w-full">
                    <span className="flex items-center gap-1.5 truncate">
                      {selectedStatus ? (
                        <>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: selectedStatus.color }} />
                          <span className="truncate">{selectedStatus.label}</span>
                        </>
                      ) : <span style={{ color: "var(--text-secondary)" }}>None</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                    {statuses.map(s => (
                      <SelectItem key={s.uuid} value={String(s.id)}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Billing Cycle</Label>
                <Select value={form.billingCycleId} onValueChange={v => set("billingCycleId", v ?? "")}>
                  <SelectTrigger className="h-8 text-sm w-full">
                    <span className="flex items-center gap-1.5 truncate">
                      {selectedBillingCycle ? (
                        <>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: selectedBillingCycle.color }} />
                          <span className="truncate">{selectedBillingCycle.label}</span>
                        </>
                      ) : <span style={{ color: "var(--text-secondary)" }}>None</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                    {billingCycles.map(b => (
                      <SelectItem key={b.uuid} value={String(b.id)}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                          {b.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6: Price + Next Renewal Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Price</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className="h-8 text-sm" placeholder="Current price" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Next Renewal Amount
                  <span className="ml-1 text-[10px] font-normal" style={{ color: "var(--text-secondary)" }}>(if different from price)</span>
                </Label>
                <Input type="number" min="0" step="0.01" value={form.nextRenewalAmount} onChange={e => set("nextRenewalAmount", e.target.value)} className="h-8 text-sm" placeholder="Leave blank if same" />
              </div>
            </div>

            {/* Row 6b: Currency + Autopay */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Currency</Label>
                <Select value={form.currency} onValueChange={v => set("currency", v ?? "INR")}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Autopay</Label>
                <div className="flex items-center gap-2 h-8">
                  <AutopayToggle value={form.autopay} onChange={v => set("autopay", v)} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {form.autopay ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 7: Plan Tier + Usage Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Plan Tier</Label>
                <Select value={form.planTier} onValueChange={v => set("planTier", v ?? "")}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Usage Type</Label>
                <Select value={form.usageType} onValueChange={v => set("usageType", v ?? "")}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=""><span style={{ color: "var(--text-secondary)" }}>None</span></SelectItem>
                    <SelectItem value="internal">Internal (Company Use)</SelectItem>
                    <SelectItem value="client">Client Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 7: Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Remarks</Label>
              <RichTextEditor
                key={`editor-${editorKey}`}
                value={form.remarks}
                onChange={v => set("remarks", v)}
                editable
              />
            </div>

            {error && (
              <p className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} size="sm">Cancel</Button>
              <Button type="submit" disabled={saving} size="sm">
                {saving ? "Saving…" : editUuid ? "Save Changes" : "Add Subscription"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
