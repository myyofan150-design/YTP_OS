"use client";

import { useRef } from "react";
import { User, Phone, GraduationCap, MapPin, Camera, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StepProps, EducationEntry } from "../AddEmployeeWizard";

function Section({
  icon: Icon, title, desc, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const GENDER_OPTIONS = ["male", "female", "other"];
const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed"];
const MARITAL_LABELS: Record<string, string> = {
  single: "Single", married: "Married", divorced: "Divorced", widowed: "Widowed",
};
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export function Step1PersonalDetails({ formData, onChange, setFileData }: StepProps) {
  const photoRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileData("photo", file);
    onChange({ photoPreviewUrl: URL.createObjectURL(file) });
  }

  function addEducationEntry() {
    onChange({
      educationEntries: [
        ...formData.educationEntries,
        { qualification: "", schoolCollege: "", percentage: "" },
      ],
    });
  }

  function removeEducationEntry(index: number) {
    if (formData.educationEntries.length <= 1) return;
    onChange({ educationEntries: formData.educationEntries.filter((_, i) => i !== index) });
  }

  function updateEducationEntry(index: number, updates: Partial<EducationEntry>) {
    onChange({
      educationEntries: formData.educationEntries.map((e, i) =>
        i === index ? { ...e, ...updates } : e
      ),
    });
  }

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Section icon={User} title="Identity" desc="Name, photo, and demographics">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="relative w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all shrink-0 overflow-hidden group"
          >
            {formData.photoPreviewUrl ? (
              <img src={formData.photoPreviewUrl} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </span>
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="flex-1">
            <Field label="Full Name" required>
              <Input
                className="h-10 text-sm"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={e => onChange({ name: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth" required>
            <Input
              type="date"
              className="h-10 text-sm"
              value={formData.dateOfBirth}
              onChange={e => onChange({ dateOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Gender" required>
            <Select value={formData.gender} onValueChange={v => onChange({ gender: v ?? "" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map(o => (
                  <SelectItem key={o} value={o} className="text-sm">{GENDER_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Marital Status">
            <Select value={formData.maritalStatus} onValueChange={v => onChange({ maritalStatus: v ?? "" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {MARITAL_OPTIONS.map(o => (
                  <SelectItem key={o} value={o} className="text-sm">{MARITAL_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Blood Group">
            <Select value={formData.bloodGroup} onValueChange={v => onChange({ bloodGroup: v ?? "" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map(g => (
                  <SelectItem key={g} value={g} className="text-sm">{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nationality">
            <Input
              className="h-10 text-sm"
              placeholder="Indian"
              value={formData.nationality}
              onChange={e => onChange({ nationality: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      {/* Contact */}
      <Section icon={Phone} title="Contact" desc="Email and phone numbers">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Personal Email" required>
            <Input
              type="email"
              className="h-10 text-sm"
              placeholder="rahul@gmail.com"
              value={formData.personalEmail}
              onChange={e => onChange({ personalEmail: e.target.value })}
            />
          </Field>
          <Field label="Phone" required>
            <Input
              className="h-10 text-sm"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={e => onChange({ phone: e.target.value })}
            />
          </Field>
        </div>
        <Field label="WhatsApp Number" required>
          <Input
            className="h-10 text-sm"
            placeholder="+91 98765 43210"
            value={formData.whatsappNumber}
            onChange={e => onChange({ whatsappNumber: e.target.value })}
          />
        </Field>
      </Section>

      {/* Background — multiple education entries */}
      <Section icon={GraduationCap} title="Background" desc="Education qualifications (at least one required)">
        <div className="space-y-3">
          {formData.educationEntries.map((entry, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-3 space-y-3 relative">
              {formData.educationEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEducationEntry(i)}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Education {i + 1}{i === 0 && <span className="text-destructive ml-0.5">*</span>}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Qualification" required={i === 0}>
                  <Input
                    className="h-10 text-sm"
                    placeholder="B.Tech, MBA, B.Sc…"
                    value={entry.qualification}
                    onChange={e => updateEducationEntry(i, { qualification: e.target.value })}
                  />
                </Field>
                <Field label="School / College">
                  <Input
                    className="h-10 text-sm"
                    placeholder="University name"
                    value={entry.schoolCollege}
                    onChange={e => updateEducationEntry(i, { schoolCollege: e.target.value })}
                  />
                </Field>
                <Field label="Percentage / CGPA">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-10 text-sm"
                    placeholder="e.g. 8.50 or 78.00"
                    value={entry.percentage}
                    onChange={e => updateEducationEntry(i, { percentage: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEducationEntry}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
        >
          <Plus className="w-3.5 h-3.5" /> Add Education
        </button>
      </Section>

      {/* Address */}
      <Section icon={MapPin} title="Address" desc="Current residential and permanent address">
        {/* Current Residential */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide -mb-1">
          Current Residential Address
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Flat / Door No.">
            <Input
              className="h-10 text-sm"
              placeholder="4B, Tower 1"
              value={formData.flatDoor}
              onChange={e => onChange({ flatDoor: e.target.value })}
            />
          </Field>
          <Field label="PIN Code">
            <Input
              className="h-10 text-sm"
              placeholder="600001"
              value={formData.pinCode}
              onChange={e => onChange({ pinCode: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Street / Area">
          <Input
            className="h-10 text-sm"
            placeholder="123 Anna Nagar, Near…"
            value={formData.street}
            onChange={e => onChange({ street: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <Input className="h-10 text-sm" placeholder="Chennai" value={formData.city} onChange={e => onChange({ city: e.target.value })} />
          </Field>
          <Field label="State">
            <Input className="h-10 text-sm" placeholder="Tamil Nadu" value={formData.state} onChange={e => onChange({ state: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input className="h-10 text-sm" placeholder="India" value={formData.country} onChange={e => onChange({ country: e.target.value })} />
          </Field>
        </div>

        {/* Permanent Address */}
        <div className="border-t border-border/50 pt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Permanent Address <span className="text-destructive">*</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Flat / Door No.">
              <Input
                className="h-10 text-sm"
                placeholder="4B, Tower 1"
                value={formData.permFlatDoor}
                onChange={e => onChange({ permFlatDoor: e.target.value })}
              />
            </Field>
            <Field label="PIN Code">
              <Input
                className="h-10 text-sm"
                placeholder="600001"
                value={formData.permPinCode}
                onChange={e => onChange({ permPinCode: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Street / Area">
            <Input
              className="h-10 text-sm"
              placeholder="123 Anna Nagar, Near…"
              value={formData.permStreet}
              onChange={e => onChange({ permStreet: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Field label="City" required>
              <Input className="h-10 text-sm" placeholder="Chennai" value={formData.permCity} onChange={e => onChange({ permCity: e.target.value })} />
            </Field>
            <Field label="State">
              <Input className="h-10 text-sm" placeholder="Tamil Nadu" value={formData.permState} onChange={e => onChange({ permState: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input className="h-10 text-sm" placeholder="India" value={formData.permCountry} onChange={e => onChange({ permCountry: e.target.value })} />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  );
}
