"use client";

import { useEffect, useState } from "react";
import { Briefcase, Calendar, FileText, X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import type { StepProps, RoleEntry, SkillEntry } from "../AddEmployeeWizard";
import type { ApiResponse, Employee } from "@/types";

// ─── Department / Designation / Skillset data ─────────────────────────────────

const DEPT_DESIGNATION: Record<string, string[]> = {
  "Marketing": ["SEO Executive", "Digital Marketing Specialist", "Performance Marketer", "Marketing Manager", "Ads Specialist"],
  "Creative Design": ["Graphic Designer", "Senior Designer", "Brand Designer", "Motion Graphic Artist", "Creative Head"],
  "Video Production": ["Video Editor", "Cinematographer", "Colorist", "Production Manager", "Reels Editor"],
  "Photography": ["Photographer", "Event Photographer", "Photo Editor", "Studio Assistant"],
  "Social Media": ["Social Media Executive", "Content Strategist", "Social Media Manager", "Community Manager"],
  "Content Team": ["Content Writer", "Copywriter", "Script Writer", "Content Strategist"],
  "Web Development": ["Frontend Developer", "Backend Developer", "Full Stack Developer", "WordPress Developer"],
  "UI/UX Design": ["UI Designer", "UX Researcher", "Product Designer"],
  "Sales": ["Sales Executive", "Business Development Executive", "Sales Manager"],
  "Client Management": ["Account Manager", "Client Success Executive", "Relationship Manager"],
  "Operations": ["Operations Executive", "Operations Manager", "Project Coordinator"],
  "Project Management": ["Project Manager", "Delivery Manager", "Team Lead"],
  "Human Resources (HR)": ["HR Executive", "Talent Acquisition Specialist", "HR Manager"],
  "Finance & Accounts": ["Accountant", "Finance Executive", "Billing Executive"],
  "Administration": ["Admin Executive", "Office Administrator"],
  "Support": ["Customer Support Executive", "Technical Support Associate"],
  "Production/Event Management": ["Event Coordinator", "Production Executive", "Venue Manager"],
  "Branding": ["Brand Strategist", "Brand Consultant"],
  "Media Buying": ["Meta Ads Specialist", "Google Ads Specialist", "Media Buyer"],
  "Training & Learning": ["Trainer", "Mentor", "Learning Coordinator"],
};

const DESIGNATION_SKILLS: Record<string, string[]> = {
  "SEO Executive": ["SEO", "Keyword Research", "Google Search Console", "Ahrefs", "SEMrush", "On-page SEO"],
  "Digital Marketing Specialist": ["Meta Ads", "Google Ads", "Analytics", "Campaign Management", "Email Marketing"],
  "Performance Marketer": ["Paid Ads", "ROAS Optimization", "Funnel Strategy", "Conversion Tracking"],
  "Marketing Manager": ["Team Management", "Campaign Planning", "Reporting", "Strategy"],
  "Ads Specialist": ["Facebook Ads", "Google Ads", "Retargeting", "Audience Targeting"],
  "Graphic Designer": ["Photoshop", "Illustrator", "Canva", "Branding", "Typography"],
  "Senior Designer": ["Creative Direction", "Brand Identity", "Design Systems"],
  "Brand Designer": ["Logo Design", "Brand Guidelines", "Packaging Design"],
  "Motion Graphic Artist": ["After Effects", "Animation", "Motion Design", "Storyboarding"],
  "Creative Head": ["Art Direction", "Team Leadership", "Creative Planning"],
  "Video Editor": ["Premiere Pro", "DaVinci Resolve", "Storytelling", "Transitions"],
  "Cinematographer": ["Camera Handling", "Lighting", "Composition", "Shot Planning"],
  "Colorist": ["Color Grading", "DaVinci Resolve", "LUTs"],
  "Production Manager": ["Shoot Coordination", "Budgeting", "Scheduling"],
  "Reels Editor": ["Short-form Editing", "Trending Cuts", "Audio Sync"],
  "Photographer": ["Camera Handling", "Framing", "Lightroom", "Editing"],
  "Event Photographer": ["Event Coverage", "Flash Handling", "Client Interaction"],
  "Photo Editor": ["Photoshop", "Retouching", "Color Correction"],
  "Studio Assistant": ["Equipment Setup", "Lighting Support", "File Management"],
  "Social Media Executive": ["Instagram Management", "Scheduling", "Content Planning"],
  "Content Strategist": ["Content Planning", "Trend Analysis", "Brand Messaging"],
  "Social Media Manager": ["Team Coordination", "Campaign Strategy", "Analytics"],
  "Community Manager": ["Audience Engagement", "Communication", "Moderation"],
  "Content Writer": ["Blog Writing", "SEO Writing", "Research"],
  "Copywriter": ["Ad Copywriting", "Brand Tone", "CTA Writing"],
  "Script Writer": ["Video Scripting", "Storytelling", "YouTube Scripts"],
  "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "Next.js", "Tailwind CSS"],
  "Backend Developer": ["Node.js", "Express.js", "APIs", "PostgreSQL", "MongoDB"],
  "Full Stack Developer": ["React", "Node.js", "Database Design", "Deployment"],
  "WordPress Developer": ["WordPress", "Elementor", "PHP", "Plugin Management"],
  "UI Designer": ["Figma", "UI Systems", "Prototyping", "Visual Design"],
  "UX Researcher": ["User Research", "Wireframing", "User Flow Analysis"],
  "Product Designer": ["Product Thinking", "UX/UI", "Prototyping"],
  "Sales Executive": ["Lead Generation", "CRM", "Communication", "Negotiation"],
  "Business Development Executive": ["Client Acquisition", "Proposal Writing", "Outreach"],
  "Sales Manager": ["Team Handling", "Revenue Planning", "Reporting"],
  "Account Manager": ["Client Communication", "Reporting", "Coordination"],
  "Client Success Executive": ["Relationship Management", "Follow-ups"],
  "Relationship Manager": ["Client Retention", "Upselling", "Communication"],
  "Operations Executive": ["Coordination", "Task Tracking", "Excel", "Documentation"],
  "Operations Manager": ["Team Management", "Workflow Optimization"],
  "Project Coordinator": ["Scheduling", "Follow-ups", "Reporting"],
  "Project Manager": ["Agile", "Team Coordination", "Deadline Management"],
  "Delivery Manager": ["Resource Planning", "Delivery Tracking"],
  "Team Lead": ["Leadership", "Mentoring", "Code/Design Reviews"],
  "HR Executive": ["Recruitment", "Attendance", "Employee Handling"],
  "Talent Acquisition Specialist": ["Hiring", "Screening", "Interview Coordination"],
  "HR Manager": ["HR Policies", "Team Management", "Payroll Oversight"],
  "Accountant": ["Tally", "GST", "Bookkeeping", "Financial Reports"],
  "Finance Executive": ["Budgeting", "Invoice Management", "Excel"],
  "Billing Executive": ["Invoice Processing", "Payment Follow-up"],
  "Admin Executive": ["Office Coordination", "Vendor Management"],
  "Office Administrator": ["Documentation", "Scheduling", "Inventory"],
  "Customer Support Executive": ["Communication", "Ticket Handling", "CRM"],
  "Technical Support Associate": ["Troubleshooting", "Technical Assistance"],
  "Event Coordinator": ["Event Planning", "Vendor Coordination"],
  "Production Executive": ["Shoot Management", "Logistics"],
  "Venue Manager": ["Venue Operations", "Coordination"],
  "Brand Strategist": ["Brand Positioning", "Market Research"],
  "Brand Consultant": ["Brand Development", "Strategy Planning"],
  "Meta Ads Specialist": ["Facebook Ads", "Audience Targeting", "Pixel Setup"],
  "Google Ads Specialist": ["Search Ads", "Display Ads", "Keyword Strategy"],
  "Media Buyer": ["Budget Optimization", "Ad Buying", "Analytics"],
  "Trainer": ["Teaching", "Presentation", "Mentoring"],
  "Mentor": ["Guidance", "Team Support", "Skill Development"],
  "Learning Coordinator": ["Training Planning", "Documentation"],
};

const ALL_DEPARTMENTS = Object.keys(DEPT_DESIGNATION);
const EXPERTISE_LEVELS = ["Learning", "Basic", "Intermediate", "Pro"];
const EMP_TYPE_OPTIONS = ["full_time", "part_time", "contract", "internship", "freelance", "consultant"];
const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full Time", part_time: "Part Time", contract: "Contract",
  internship: "Internship", freelance: "Freelance", consultant: "Consultant",
};
const CONTRACT_TYPES = ["contract", "internship", "freelance", "consultant"];

// ─── Shared layout components ─────────────────────────────────────────────────

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

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Creatable select (predefined options + type custom) ──────────────────────

function CreatableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select or type custom…",
  disabled = false,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const isCustom = value !== "" && !options.includes(value);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);
  const [customVal, setCustomVal] = useState(isCustom ? value : "");

  if (showCustomInput) {
    return (
      <div className="flex gap-2">
        <Input
          className="h-10 text-sm flex-1"
          placeholder="Type custom value…"
          value={customVal}
          disabled={disabled}
          onChange={e => { setCustomVal(e.target.value); onValueChange(e.target.value); }}
        />
        <button
          type="button"
          onClick={() => { setShowCustomInput(false); setCustomVal(""); onValueChange(""); }}
          className="w-9 h-10 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={v => {
        if (v === "__custom__") { setShowCustomInput(true); onValueChange(""); }
        else onValueChange(v ?? "");
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-10 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>
        ))}
        <SelectItem value="__custom__" className="text-sm text-primary font-medium">
          + Add custom…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step2JobInformation({ formData, onChange }: StepProps) {
  const [managers, setManagers] = useState<Employee[]>([]);

  const isContract = CONTRACT_TYPES.includes(formData.employeeType);

  useEffect(() => {
    api.get<ApiResponse<Employee[]>>("/employees")
      .then(r => setManagers(r.data.data))
      .catch(() => {});
  }, []);

  // Derive recommended skills from the last designation in roleEntries
  const lastDesignation = [...formData.roleEntries]
    .reverse()
    .find(r => r.designation)?.designation ?? "";
  const recommendedSkills = lastDesignation ? (DESIGNATION_SKILLS[lastDesignation] ?? []) : [];
  const skillsEnabled = formData.roleEntries.some(r => r.designation.trim() !== "");

  function addRoleEntry() {
    onChange({ roleEntries: [...formData.roleEntries, { department: "", designation: "" }] });
  }

  function removeRoleEntry(index: number) {
    if (formData.roleEntries.length <= 1) return;
    onChange({ roleEntries: formData.roleEntries.filter((_, i) => i !== index) });
  }

  function updateRoleEntry(index: number, updates: Partial<RoleEntry>) {
    onChange({
      roleEntries: formData.roleEntries.map((e, i) => i === index ? { ...e, ...updates } : e),
    });
  }

  function addSkillEntry() {
    onChange({ skillEntries: [...formData.skillEntries, { skill: "", expertiseLevel: "" }] });
  }

  function removeSkillEntry(index: number) {
    onChange({ skillEntries: formData.skillEntries.filter((_, i) => i !== index) });
  }

  function updateSkillEntry(index: number, updates: Partial<SkillEntry>) {
    onChange({
      skillEntries: formData.skillEntries.map((e, i) => i === index ? { ...e, ...updates } : e),
    });
  }

  return (
    <div className="space-y-4">
      {/* Role */}
      <Section icon={Briefcase} title="Role" desc="Employee type, work mode, department, and designation">
        {/* Employee Type */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Type" required>
            <Select value={formData.employeeType} onValueChange={v => onChange({ employeeType: v ?? "full_time" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMP_TYPE_OPTIONS.map(o => (
                  <SelectItem key={o} value={o} className="text-sm">{EMP_TYPE_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Work Mode">
            <Select value={formData.workMode} onValueChange={v => onChange({ workMode: v ?? "office", workLocation: ["office", "hybrid"].includes(v ?? "") ? formData.workLocation : "" })}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office" className="text-sm">Office</SelectItem>
                <SelectItem value="remote" className="text-sm">Remote</SelectItem>
                <SelectItem value="hybrid" className="text-sm">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Work Location — only enabled for office/hybrid */}
        <Field label="Work Location">
          <Input
            className="h-10 text-sm"
            placeholder="Office Location"
            value={formData.workLocation}
            disabled={!["office", "hybrid"].includes(formData.workMode)}
            onChange={e => onChange({ workLocation: e.target.value })}
          />
          {!["office", "hybrid"].includes(formData.workMode) && (
            <p className="text-[11px] text-muted-foreground mt-1">Select Office or Hybrid work mode to enable this field.</p>
          )}
        </Field>

        {/* Reporting Manager */}
        <Field label="Reporting Manager">
          <Select value={formData.reportingManagerId} onValueChange={v => onChange({ reportingManagerId: v ?? "" })}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-sm">— None —</SelectItem>
              {managers.map(m => (
                <SelectItem key={m.id} value={String(m.id)} className="text-sm">
                  {m.user.name} ({m.designation ?? m.department ?? m.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Multiple Role Entries */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Department & Designation <span className="text-destructive">*</span>
            <span className="normal-case font-normal ml-1">(at least one required)</span>
          </p>
          {formData.roleEntries.map((entry, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-3 space-y-3 relative">
              {formData.roleEntries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoleEntry(i)}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label={i === 0 ? "Department *" : "Department"}>
                  <CreatableSelect
                    value={entry.department}
                    onValueChange={v => updateRoleEntry(i, { department: v, designation: "" })}
                    options={ALL_DEPARTMENTS}
                    placeholder="Select department…"
                  />
                </Field>
                <Field label={i === 0 ? "Designation *" : "Designation"}>
                  <CreatableSelect
                    value={entry.designation}
                    onValueChange={v => updateRoleEntry(i, { designation: v })}
                    options={entry.department ? (DEPT_DESIGNATION[entry.department] ?? []) : []}
                    disabled={!entry.department}
                    placeholder={entry.department ? "Select designation…" : "Select department first"}
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRoleEntry}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
          >
            <Plus className="w-3.5 h-3.5" /> Add Role
          </button>
        </div>

        {/* Skillset — inside Role section */}
        <div className="border-t border-border/50 pt-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Skillset
            {!skillsEnabled && <span className="normal-case font-normal ml-1 text-muted-foreground/60"> — select a designation above to enable</span>}
          </p>
          {formData.skillEntries.map((entry, i) => (
            <div key={i} className="flex gap-3 items-end">
              <div className="flex-1">
                <Field label="Skillset / Tool">
                  <CreatableSelect
                    value={entry.skill}
                    onValueChange={v => updateSkillEntry(i, { skill: v })}
                    options={recommendedSkills}
                    disabled={!skillsEnabled}
                    placeholder={skillsEnabled ? "Select or type skill…" : "Select designation first"}
                  />
                </Field>
              </div>
              <div className="w-40">
                <Field label="Expertise Level">
                  <Select
                    value={entry.expertiseLevel}
                    onValueChange={v => updateSkillEntry(i, { expertiseLevel: v ?? "" })}
                    disabled={!skillsEnabled}
                  >
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      {EXPERTISE_LEVELS.map(l => (
                        <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <button
                type="button"
                onClick={() => removeSkillEntry(i)}
                className="mb-0.5 w-9 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSkillEntry}
            disabled={!skillsEnabled}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors border border-dashed border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add Skill
          </button>
        </div>
      </Section>

      {/* Schedule & Dates */}
      <Section icon={Calendar} title="Schedule & Dates" desc="Joining, probation, and shift timings">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Joining Date" required>
            <Input type="date" className="h-10 text-sm" value={formData.joiningDate} onChange={e => onChange({ joiningDate: e.target.value })} />
          </Field>
          <Field label="Probation End">
            <Input type="date" className="h-10 text-sm" value={formData.probationEndDate} onChange={e => onChange({ probationEndDate: e.target.value })} />
          </Field>
          <Field label="Confirmation Date">
            <Input type="date" className="h-10 text-sm" value={formData.confirmationDate} onChange={e => onChange({ confirmationDate: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Shift Start">
            <Input type="time" className="h-10 text-sm" value={formData.shiftStart} onChange={e => onChange({ shiftStart: e.target.value })} />
          </Field>
          <Field label="Shift End">
            <Input type="time" className="h-10 text-sm" value={formData.shiftEnd} onChange={e => onChange({ shiftEnd: e.target.value })} />
          </Field>
        </div>
      </Section>

      {/* Contract — conditional */}
      {isContract && (
        <Section icon={FileText} title="Contract" desc="Contract duration and renewal settings">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contract End Date">
              <Input type="date" className="h-10 text-sm" value={formData.contractEndDate} onChange={e => onChange({ contractEndDate: e.target.value })} />
            </Field>
            <Field label="Remind before expiry (days)">
              <Input type="number" min={1} className="h-10 text-sm" placeholder="30" value={formData.contractRenewalReminder} onChange={e => onChange({ contractRenewalReminder: e.target.value })} />
            </Field>
          </div>
        </Section>
      )}

    </div>
  );
}
