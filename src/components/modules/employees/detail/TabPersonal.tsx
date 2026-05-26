"use client";

import { useState } from "react";
import { User, Phone, GraduationCap, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const MARITAL_LABELS: Record<string, string> = { single: "Single", married: "Married", divorced: "Divorced", widowed: "Widowed" };

function InfoCard({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </span>
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function TabPersonal({ employee, uuid, canEdit }: DetailTabProps) {
  const [avatarErr, setAvatarErr] = useState(false);
  const router = useRouter();

  const addr = employee.address;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=1`)}>
            <Pencil className="w-3 h-3" /> Edit Personal Details
          </Button>
        </div>
      )}

      <InfoCard icon={User} title="Identity">
        <div className="col-span-2 flex items-center gap-4 pb-2 border-b border-border/50">
          {resolveAssetUrl(employee.user.avatarUrl) && !avatarErr ? (
            <img src={resolveAssetUrl(employee.user.avatarUrl)!} alt={employee.user.name}
              onError={() => setAvatarErr(true)}
              className="w-14 h-14 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
              {employee.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-base font-semibold text-foreground">{employee.user.name}</p>
            <p className="text-xs text-muted-foreground">{employee.user.email}</p>
          </div>
        </div>
        <Row label="Date of Birth"  value={fmt(employee.dateOfBirth)} />
        <Row label="Gender"         value={GENDER_LABELS[employee.gender ?? ""] ?? employee.gender} />
        <Row label="Marital Status" value={MARITAL_LABELS[employee.maritalStatus ?? ""] ?? employee.maritalStatus} />
        <Row label="Blood Group"    value={employee.bloodGroup} />
        <Row label="Nationality"    value={employee.nationality} />
      </InfoCard>

      <InfoCard icon={Phone} title="Contact">
        <Row label="Personal Email" value={employee.personalEmail} />
        <Row label="Phone"          value={employee.phone} />
        <Row label="WhatsApp"       value={(employee as typeof employee & { whatsappNumber?: string | null }).whatsappNumber} />
      </InfoCard>

      <InfoCard icon={GraduationCap} title="Background">
        <Row label="Education"        value={employee.educationQualification} />
        <Row label="School / College" value={employee.schoolCollege} />
      </InfoCard>

      <InfoCard icon={Phone} title="Emergency Contacts">
        {(employee.emergencyContacts ?? []).length === 0 ? (
          <p className="col-span-2 text-sm text-muted-foreground">No emergency contacts added.</p>
        ) : (
          (employee.emergencyContacts ?? []).map((c, i) => (
            <div key={i} className="col-span-2 grid grid-cols-2 gap-4 pb-3 last:pb-0 border-b last:border-0 border-border/50">
              <Row label={`Contact ${i + 1} Name`} value={c.name} />
              <Row label="Relationship"             value={c.relationship} />
              <Row label="Phone"                    value={c.phone} />
              <Row label="Email"                    value={c.email} />
            </div>
          ))
        )}
      </InfoCard>

      {addr && (
        <InfoCard icon={MapPin} title="Address">
          <Row label="Flat / Door"   value={addr.flatDoor} />
          <Row label="PIN Code"      value={addr.pinCode} />
          <Row label="Street / Area" value={addr.street} />
          <Row label="City"          value={addr.city} />
          <Row label="State"         value={addr.state} />
          <Row label="Country"       value={addr.country} />
        </InfoCard>
      )}
    </div>
  );
}
