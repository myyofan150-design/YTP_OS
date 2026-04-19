"use client";

// src/components/modules/clients/CredentialsTab.tsx
// Lists credentials with masked passwords + reveal toggle. Allows adding/deleting.

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientCredential } from "@/types";

interface Props {
  uuid: string;
  credentials: ClientCredential[];
  canEdit: boolean;
  onRefresh: () => void;
}

function CredentialRow({
  cred,
  canEdit,
  onDelete,
}: {
  cred: ClientCredential;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete credential for "${cred.platform}"?`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-slate-800">{cred.platform}</p>
        {cred.username && (
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">User:</span> {cred.username}
          </p>
        )}
        {cred.password && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-slate-700">
              {visible ? cred.password : "•".repeat(Math.min(cred.password.length, 16))}
            </p>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        )}
        {cred.url && (
          <p className="text-xs text-slate-500 truncate">
            <span className="font-medium text-slate-600">URL:</span>{" "}
            <a href={cred.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              {cred.url}
            </a>
          </p>
        )}
        {cred.notes && <p className="text-xs text-slate-500 italic">{cred.notes}</p>}
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          disabled={deleting}
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs shrink-0"
        >
          {deleting ? "…" : "Delete"}
        </Button>
      )}
    </div>
  );
}

export function CredentialsTab({ uuid, credentials, canEdit, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "", username: "", password: "", url: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAdd(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.platform) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/clients/${uuid}/credentials`, {
        platform: form.platform,
        username: form.username || null,
        password: form.password || null,
        url:      form.url      || null,
        notes:    form.notes    || null,
      });
      setForm({ platform: "", username: "", password: "", url: "", notes: "" });
      setShowForm(false);
      onRefresh();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to add credential"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(credId: number) {
    await api.delete(`/clients/${uuid}/credentials/${credId}`);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Saved Credentials</h3>
        {canEdit && !showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white"
          >
            + Add Credential
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleAdd} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700">New Credential</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Platform *</Label>
              <Input value={form.platform} onChange={(e) => set("platform", e.target.value)} required className="h-8 text-xs" placeholder="e.g. Google Ads" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Username</Label>
              <Input value={form.username} onChange={(e) => set("username", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Password</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">URL</Label>
              <Input value={form.url} onChange={(e) => set("url", e.target.value)} className="h-8 text-xs" placeholder="https://" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Notes</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="h-8 text-xs" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} size="sm" className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {credentials.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No credentials stored yet.</p>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <CredentialRow
              key={cred.id}
              cred={cred}
              canEdit={canEdit}
              onDelete={() => handleDelete(cred.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
