"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Save } from "lucide-react";
import type { ApiResponse } from "@/types";

interface GeneralSettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [settings, setSettings]   = useState<GeneralSettings>({
    company_name: "", company_tagline: "", company_email: "", company_logo_url: null,
  });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [logoFile, setLogoFile]   = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<ApiResponse<GeneralSettings>>("/settings/general")
      .then(r => setSettings(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setSaving(true);
    setSuccessMsg(""); setErrorMsg("");
    try {
      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const logoRes = await api.post<ApiResponse<{ logoUrl: string }>>("/settings/general/logo", fd);
        setSettings(prev => ({ ...prev, company_logo_url: logoRes.data.data.logoUrl }));
        setLogoFile(null);
        setLogoPreview(null);
      }
      const res = await api.patch<ApiResponse<GeneralSettings>>("/settings/general", {
        company_name:    settings.company_name    || null,
        company_tagline: settings.company_tagline || null,
        company_email:   settings.company_email   || null,
      });
      setSettings(res.data.data);
      setSuccessMsg("Settings saved successfully.");
    } catch {
      setErrorMsg("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const logoSrc = logoPreview ?? resolveAssetUrl(settings.company_logo_url);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">General Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Company branding used across invoices and the app</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-border bg-card p-6">

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Logo</Label>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => isSuperAdmin && logoRef.current?.click()}
              disabled={!isSuperAdmin}
              className={`relative w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden group transition-all ${
                isSuperAdmin ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default opacity-70"
              }`}
            >
              {logoSrc ? (
                <img src={logoSrc} alt="Company logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Camera className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              {isSuperAdmin && (
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <Camera className="w-5 h-5 text-white" />
                </span>
              )}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground">Upload company logo</p>
              <p className="text-xs">JPG, PNG up to 2 MB · Shown on invoices and headers</p>
              {!isSuperAdmin && <p className="text-xs text-amber-500">Only SUPER_ADMIN can change settings</p>}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name" className="text-sm font-medium">Company Name</Label>
            <Input
              id="company_name"
              value={settings.company_name ?? ""}
              onChange={e => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
              disabled={!isSuperAdmin}
              placeholder="Your Agency Name"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_tagline" className="text-sm font-medium">Tagline</Label>
            <Input
              id="company_tagline"
              value={settings.company_tagline ?? ""}
              onChange={e => setSettings(prev => ({ ...prev, company_tagline: e.target.value }))}
              disabled={!isSuperAdmin}
              placeholder="e.g. Digital Marketing Agency"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_email" className="text-sm font-medium">Company Email</Label>
            <Input
              id="company_email"
              type="email"
              value={settings.company_email ?? ""}
              onChange={e => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
              disabled={!isSuperAdmin}
              placeholder="contact@yourcompany.com"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {successMsg && (
          <p className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{errorMsg}</p>
        )}

        {isSuperAdmin && (
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving} className="h-9 text-sm gap-2">
              <Save size={14} />
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
