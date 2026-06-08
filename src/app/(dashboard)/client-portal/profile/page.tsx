"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Phone, Mail, MapPin, FileText, Tag } from "lucide-react";

interface ClientProfile {
  uuid: string;
  companyName: string;
  contactPerson: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  status: string;
  contractType: string;
  monthlyFee: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  services: string[];
  logoUrl: string | null;
  notes: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: "#22c55e18", color: "#22c55e" },
  PROSPECT: { bg: "#6366f118", color: "#6366f1" },
  CHURNED:  { bg: "#ef444418", color: "#ef4444" },
  PAUSED:   { bg: "#94a3b818", color: "#94a3b8" },
};

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "var(--bg-elevated)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{value ?? "—"}</div>
      </div>
    </div>
  );
}

export default function ClientPortalProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/client-portal/profile");
      setProfile(r.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Header */}
      <div className="card-hover animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.companyName}
              className="h-16 w-16 rounded-xl object-contain bg-muted" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl font-bold text-2xl text-black"
              style={{ background: "#00C4A7" }}>
              {profile.companyName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{profile.companyName}</h1>
            <p className="text-sm text-muted-foreground">{profile.contactPerson}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-xs border-0"
                style={{ background: STATUS_STYLES[profile.status]?.bg, color: STATUS_STYLES[profile.status]?.color }}>
                {profile.status}
              </Badge>
              <Badge variant="outline" className="text-xs">{profile.contractType}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card px-5 py-2" style={{ animationDelay: "100ms" }}>
        <Row icon={<Mail size={14} className="text-muted-foreground" />} label="Email" value={profile.email} />
        <Row icon={<Phone size={14} className="text-muted-foreground" />} label="Phone" value={profile.phone} />
        <Row icon={<MapPin size={14} className="text-muted-foreground" />} label="Address" value={profile.address} />
        <Row icon={<FileText size={14} className="text-muted-foreground" />} label="GST Number" value={profile.gstNumber} />
        <Row
          icon={<Building2 size={14} className="text-muted-foreground" />}
          label="Contract"
          value={`${profile.contractType}${profile.monthlyFee ? ` · ₹${profile.monthlyFee.toLocaleString("en-IN")}/mo` : ""}`}
        />
        {profile.contractStart && (
          <Row
            icon={<Tag size={14} className="text-muted-foreground" />}
            label="Contract Period"
            value={`${new Date(profile.contractStart).toLocaleDateString("en-IN")} — ${profile.contractEnd ? new Date(profile.contractEnd).toLocaleDateString("en-IN") : "Ongoing"}`}
          />
        )}
        {(profile.services?.length ?? 0) > 0 && (
          <Row
            icon={<Tag size={14} className="text-muted-foreground" />}
            label="Services"
            value={
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.services.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
