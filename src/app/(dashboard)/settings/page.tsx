"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { resolveAssetUrl } from "@/lib/utils";
import { SETTINGS_UPDATED_EVENT } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, LayoutDashboard, Save, Stamp } from "lucide-react";
import type { ApiResponse } from "@/types";

interface GeneralSettings {
  company_name: string | null;
  company_tagline: string | null;
  company_email: string | null;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_seal_url: string | null;
  sidebar_icon_url: string | null;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (user?.role === "EMPLOYEE") router.replace("/");
  }, [user?.role, router]);

  const [settings, setSettings]       = useState<GeneralSettings>({
    company_name: "", company_tagline: "", company_email: "", company_logo_url: null,
    company_phone: "", company_address: "", company_seal_url: null, sidebar_icon_url: null,
  });
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sealFile, setSealFile]               = useState<File | null>(null);
  const [sealPreview, setSealPreview]         = useState<string | null>(null);
  const [sidebarIconFile, setSidebarIconFile]       = useState<File | null>(null);
  const [sidebarIconPreview, setSidebarIconPreview] = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState("");
  const [errorMsg, setErrorMsg]       = useState("");
  const logoRef       = useRef<HTMLInputElement>(null);
  const sealRef       = useRef<HTMLInputElement>(null);
  const sidebarIconRef = useRef<HTMLInputElement>(null);

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

  function handleSealChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSealFile(file);
    setSealPreview(URL.createObjectURL(file));
  }

  function handleSidebarIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSidebarIconFile(file);
    setSidebarIconPreview(URL.createObjectURL(file));
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
      if (sealFile) {
        const fd = new FormData();
        fd.append("seal", sealFile);
        const sealRes = await api.post<ApiResponse<{ sealUrl: string }>>("/settings/general/seal", fd);
        setSettings(prev => ({ ...prev, company_seal_url: sealRes.data.data.sealUrl }));
        setSealFile(null);
        setSealPreview(null);
      }
      if (sidebarIconFile) {
        const fd = new FormData();
        fd.append("sidebarIcon", sidebarIconFile);
        const iconRes = await api.post<ApiResponse<{ sidebarIconUrl: string }>>("/settings/general/sidebar-icon", fd);
        setSettings(prev => ({ ...prev, sidebar_icon_url: iconRes.data.data.sidebarIconUrl }));
        setSidebarIconFile(null);
        setSidebarIconPreview(null);
      }
      const res = await api.patch<ApiResponse<GeneralSettings>>("/settings/general", {
        company_name:    settings.company_name    || null,
        company_tagline: settings.company_tagline || null,
        company_email:   settings.company_email   || null,
        company_phone:   settings.company_phone   || null,
        company_address: settings.company_address || null,
      });
      setSettings(res.data.data);
      setSuccessMsg("Settings saved successfully.");
      window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
    } catch {
      setErrorMsg("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const logoSrc        = logoPreview        ?? resolveAssetUrl(settings.company_logo_url);
  const sealSrc        = sealPreview        ?? resolveAssetUrl(settings.company_seal_url);
  const sidebarIconSrc = sidebarIconPreview ?? resolveAssetUrl(settings.sidebar_icon_url);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-foreground">General Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Company branding used across invoices and the app</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-border bg-card p-6 animate-fade-up delay-100">

        {/* Logo + Seal + Sidebar Icon */}
        <div className="grid grid-cols-3 gap-6">
          {/* Company Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Logo</Label>
            <div className="flex items-center gap-4">
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
                <p className="font-medium text-foreground text-xs">Header logo</p>
                <p className="text-xs">JPG, PNG · 2 MB max</p>
              </div>
            </div>
          </div>

          {/* Company Seal */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice Seal</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => isSuperAdmin && sealRef.current?.click()}
                disabled={!isSuperAdmin}
                className={`relative w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden group transition-all ${
                  isSuperAdmin ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default opacity-70"
                }`}
              >
                {sealSrc ? (
                  <img src={sealSrc} alt="Company seal" className="w-full h-full object-contain" />
                ) : (
                  <Stamp className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                {isSuperAdmin && (
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Camera className="w-5 h-5 text-white" />
                  </span>
                )}
              </button>
              <input ref={sealRef} type="file" accept="image/*" className="hidden" onChange={handleSealChange} />
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground text-xs">Stamp / seal</p>
                <p className="text-xs">Shown on invoice T&amp;C</p>
              </div>
            </div>
          </div>

          {/* Sidebar Icon */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sidebar Icon</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => isSuperAdmin && sidebarIconRef.current?.click()}
                disabled={!isSuperAdmin}
                className={`relative w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden group transition-all ${
                  isSuperAdmin ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default opacity-70"
                }`}
              >
                {sidebarIconSrc ? (
                  <img src={sidebarIconSrc} alt="Sidebar icon" className="w-full h-full object-contain p-1" />
                ) : (
                  <LayoutDashboard className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                {isSuperAdmin && (
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <Camera className="w-5 h-5 text-white" />
                  </span>
                )}
              </button>
              <input ref={sidebarIconRef} type="file" accept="image/*" className="hidden" onChange={handleSidebarIconChange} />
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground text-xs">Nav icon</p>
                <p className="text-xs">Shown in sidebar</p>
              </div>
            </div>
          </div>
        </div>

        {!isSuperAdmin && (
          <p className="text-xs text-amber-500">Only SUPER_ADMIN can change settings</p>
        )}

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
              placeholder="e.g. A Creative Marketing Agency"
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

          <div className="space-y-1.5">
            <Label htmlFor="company_phone" className="text-sm font-medium">Company Phone</Label>
            <Input
              id="company_phone"
              type="tel"
              value={settings.company_phone ?? ""}
              onChange={e => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
              disabled={!isSuperAdmin}
              placeholder="+91 98765 43210"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_address" className="text-sm font-medium">Company Address</Label>
            <Input
              id="company_address"
              value={settings.company_address ?? ""}
              onChange={e => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
              disabled={!isSuperAdmin}
              placeholder="123 Main Street, City - 600001"
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
