"use client";

import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StepProps, EmergencyContactForm } from "../AddEmployeeWizard";

const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Friend", "Other"];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ContactSection({
  index, contact, onChange,
}: {
  index: number;
  contact: EmergencyContactForm;
  onChange: (patch: Partial<EmergencyContactForm>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5 text-primary" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">Contact {index + 1}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {index === 0 ? "Primary emergency contact" : "Secondary emergency contact"}
          </p>
        </div>
        {contact.name && (
          <span className="ml-auto text-xs text-muted-foreground font-medium truncate max-w-[140px]">{contact.name}</span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <Input className="h-10 text-sm" placeholder="Contact name" value={contact.name} onChange={e => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Relationship">
            <Select value={contact.relationship} onValueChange={v => onChange({ relationship: v ?? "" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone" required>
            <Input className="h-10 text-sm" placeholder="+91 98765 43210" value={contact.phone} onChange={e => onChange({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" className="h-10 text-sm" placeholder="email@example.com" value={contact.email} onChange={e => onChange({ email: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function Step5EmergencyContacts({ formData, onChange }: StepProps) {
  function updateContact(idx: number, patch: Partial<EmergencyContactForm>) {
    const updated = formData.emergencyContacts.map((c, i) => i === idx ? { ...c, ...patch } : c);
    onChange({ emergencyContacts: updated });
  }

  return (
    <div className="space-y-4">
      {formData.emergencyContacts.map((contact, idx) => (
        <ContactSection
          key={idx}
          index={idx}
          contact={contact}
          onChange={patch => updateContact(idx, patch)}
        />
      ))}
      <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 border border-border">
        At least one emergency contact is strongly recommended. These details are kept confidential and used only in emergencies.
      </p>
    </div>
  );
}
