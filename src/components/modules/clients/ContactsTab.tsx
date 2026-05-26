"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, MessageCircle, Phone, Mail, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { ClientContact } from "@/types";

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
      style={{ background: value ? "#6366F1" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

// ─── ContactDialog ────────────────────────────────────────────────────────────

interface ContactForm { name: string; email: string; phone: string; whatsapp: string; role: string; isPrimary: boolean; }
const EMPTY: ContactForm = { name: "", email: "", phone: "", whatsapp: "", role: "", isPrimary: false };

function ContactDialog({
  open, onClose, onSaved, clientUuid, editing,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  clientUuid: string; editing: ClientContact | null;
}) {
  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Reset when dialog opens
  useState(() => { /* handled via key reset in parent */ });

  function set(field: keyof ContactForm, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // initialise from editing contact
  if (editing && form.name === "" && form.email === "" && form.phone === "") {
    setForm({
      name:      editing.name,
      email:     editing.email     ?? "",
      phone:     editing.phone     ?? "",
      whatsapp:  editing.whatsapp  ?? "",
      role:      editing.role      ?? "",
      isPrimary: !!editing.isPrimary,
    });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name:      form.name.trim(),
        email:     form.email     || null,
        phone:     form.phone     || null,
        whatsapp:  form.whatsapp  || null,
        role:      form.role      || null,
        isPrimary: form.isPrimary,
      };
      if (editing) {
        await api.patch(`/clients/${clientUuid}/contacts/${editing.id}`, body);
        toast.success("Contact updated");
      } else {
        await api.post(`/clients/${clientUuid}/contacts`, body);
        toast.success("Contact added");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          {(["name", "email", "phone", "whatsapp", "role"] as const).map(field => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs capitalize">{field}{field === "name" && <span className="text-red-500"> *</span>}</Label>
              <Input value={form[field] as string} onChange={e => set(field, e.target.value)}
                type={field === "email" ? "email" : "text"}
                placeholder={field === "whatsapp" ? "+91…" : undefined}
                className="h-8 text-sm" autoFocus={field === "name"} />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Toggle value={form.isPrimary} onChange={v => set("isPrimary", v)} />
            <Label className="text-xs cursor-pointer">Set as Primary Contact</Label>
          </div>
          {error && <p className="text-xs rounded px-2 py-1 bg-red-50 text-red-600 border border-red-200">{error}</p>}
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ContactsTab ──────────────────────────────────────────────────────────────

interface Props {
  clientUuid: string;
  contacts:   ClientContact[];
  canEdit:    boolean;
  onRefresh:  () => void;
}

export function ContactsTab({ clientUuid, contacts, canEdit, onRefresh }: Props) {
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState<ClientContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientContact | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState("");
  const [dialogKey, setDialogKey]       = useState(0);

  function openAdd() { setEditing(null); setDialogKey(k => k + 1); setDialogOpen(true); }
  function openEdit(c: ClientContact) { setEditing(c); setDialogKey(k => k + 1); setDialogOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError("");
    try {
      await api.delete(`/clients/${clientUuid}/contacts/${deleteTarget.id}`);
      toast.success("Contact deleted");
      setDeleteTarget(null);
      onRefresh();
    } catch (err: unknown) {
      setDeleteError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
        {canEdit && (
          <Button size="sm" onClick={openAdd} className="h-8 gap-1.5 text-xs">
            <Plus size={13} />Add Contact
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-center py-10 text-sm text-slate-400">No contacts yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Primary</th>
                {canEdit && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.role ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                        <Mail size={11} />{c.email}
                      </a>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-slate-600 hover:underline">
                          <Phone size={11} />{c.phone}
                        </a>
                      )}
                      {c.whatsapp && (
                        <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>
                          <MessageCircle size={10} />
                        </a>
                      )}
                      {!c.phone && !c.whatsapp && <span className="text-slate-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Star size={9} fill="currentColor" />Primary
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(c)} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => { setDeleteTarget(c); setDeleteError(""); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm">Delete <strong>{deleteTarget.name}</strong>?</p>
          {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="h-7 px-3 rounded text-xs font-medium text-white" style={{ background: "#EF4444" }}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
              className="h-7 px-3 rounded text-xs font-medium border border-slate-200 text-slate-600 bg-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ContactDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { setDialogOpen(false); onRefresh(); }}
        clientUuid={clientUuid}
        editing={editing}
      />
    </div>
  );
}
