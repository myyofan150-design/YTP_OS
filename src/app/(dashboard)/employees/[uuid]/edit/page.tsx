"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, User, Briefcase, TrendingUp, Landmark, Users,
  Camera, Plus, Trash2, X, Loader2, Check,
  FileCheck, FileSignature, ShieldCheck,
  Upload, CheckCircle2, ChevronDown, ChevronUp, Power, PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { EmployeeDetail, ApiResponse } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { fmt } from "@/components/modules/employees/detail/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const HR_ROLES    = ["SUPER_ADMIN", "ADMIN", "HR"];
const FIN_ROLES   = ["SUPER_ADMIN", "ADMIN", "HR", "ACCOUNTANT"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed"];
const MARITAL_LABELS: Record<string, string> = { single: "Single", married: "Married", divorced: "Divorced", widowed: "Widowed" };
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const EMP_TYPES = [
  { value: "full_time",  label: "Full Time" },
  { value: "part_time",  label: "Part Time" },
  { value: "contract",   label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "consultant", label: "Consultant" },
  { value: "freelance",  label: "Freelance" },
];
const CONTRACT_TYPES = new Set(["contract", "internship", "freelance", "consultant"]);
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Friend", "Other"];

const DEPT_DESIGNATION: Record<string, string[]> = {
  "Marketing": ["SEO Executive","Digital Marketing Specialist","Performance Marketer","Marketing Manager","Ads Specialist"],
  "Creative Design": ["Graphic Designer","Senior Designer","Brand Designer","Motion Graphic Artist","Creative Head"],
  "Video Production": ["Video Editor","Cinematographer","Colorist","Production Manager","Reels Editor"],
  "Photography": ["Photographer","Event Photographer","Photo Editor","Studio Assistant"],
  "Social Media": ["Social Media Executive","Content Strategist","Social Media Manager","Community Manager"],
  "Content Team": ["Content Writer","Copywriter","Script Writer","Content Strategist"],
  "Web Development": ["Frontend Developer","Backend Developer","Full Stack Developer","WordPress Developer"],
  "UI/UX Design": ["UI Designer","UX Researcher","Product Designer"],
  "Sales": ["Sales Executive","Business Development Executive","Sales Manager"],
  "Client Management": ["Account Manager","Client Success Executive","Relationship Manager"],
  "Operations": ["Operations Executive","Operations Manager","Project Coordinator"],
  "Project Management": ["Project Manager","Delivery Manager","Team Lead"],
  "Human Resources (HR)": ["HR Executive","Talent Acquisition Specialist","HR Manager"],
  "Finance & Accounts": ["Accountant","Finance Executive","Billing Executive"],
  "Administration": ["Admin Executive","Office Administrator"],
  "Support": ["Customer Support Executive","Technical Support Associate"],
  "Production/Event Management": ["Event Coordinator","Production Executive","Venue Manager"],
  "Branding": ["Brand Strategist","Brand Consultant"],
  "Media Buying": ["Meta Ads Specialist","Google Ads Specialist","Media Buyer"],
  "Training & Learning": ["Trainer","Mentor","Learning Coordinator"],
};
const DESIGNATION_SKILLS: Record<string, string[]> = {
  "SEO Executive": ["SEO","Keyword Research","Google Search Console","Ahrefs","SEMrush","On-page SEO"],
  "Digital Marketing Specialist": ["Meta Ads","Google Ads","Analytics","Campaign Management","Email Marketing"],
  "Graphic Designer": ["Photoshop","Illustrator","Canva","Branding","Typography"],
  "Video Editor": ["Premiere Pro","DaVinci Resolve","Storytelling","Transitions"],
  "Frontend Developer": ["HTML","CSS","JavaScript","React","Next.js","Tailwind CSS"],
  "Backend Developer": ["Node.js","Express.js","APIs","PostgreSQL","MongoDB"],
  "Full Stack Developer": ["React","Node.js","Database Design","Deployment"],
  "UI Designer": ["Figma","UI Systems","Prototyping","Visual Design"],
  "HR Executive": ["Recruitment","Attendance","Employee Handling"],
  "Accountant": ["Tally","GST","Bookkeeping","Financial Reports"],
  "Project Manager": ["Agile","Team Coordination","Deadline Management"],
  "Sales Executive": ["Lead Generation","CRM","Communication","Negotiation"],
  "Content Writer": ["Blog Writing","SEO Writing","Research"],
  "Social Media Executive": ["Instagram Management","Scheduling","Content Planning"],
};
const ALL_DEPARTMENTS = Object.keys(DEPT_DESIGNATION);
const EXPERTISE_LEVELS = ["Learning", "Basic", "Intermediate", "Pro"];

const MANDATORY_DOC_SLOTS = [
  { slotName: "Aadhaar Card",                     docType: "ID_PROOF" },
  { slotName: "PAN Card",                         docType: "ID_PROOF" },
  { slotName: "Bank Passbook / Cancelled Cheque", docType: "OTHER"    },
  { slotName: "Highest Education Certificate",    docType: "OTHER"    },
];
const OPTIONAL_DOC_SLOTS = [
  { slotName: "Passport",              docType: "ID_PROOF" },
  { slotName: "Experience Certificate",docType: "OTHER"    },
  { slotName: "Last 3 Payslips",       docType: "OTHER"    },
  { slotName: "Relieving Letter",      docType: "OTHER"    },
  { slotName: "Skill Certificates",    docType: "OTHER"    },
];
const AGREEMENT_SLOTS = [
  { agreementType: "offer_letter",         name: "Offer Letter" },
  { agreementType: "appointment_letter",   name: "Appointment Letter" },
  { agreementType: "nda",                  name: "NDA" },
  { agreementType: "employment_agreement", name: "Employment Agreement" },
  { agreementType: "leave_policy",         name: "Leave Policy" },
  { agreementType: "it_policy",            name: "IT Policy" },
  { agreementType: "code_of_conduct",      name: "Code of Conduct" },
];
const ACCESS_ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN",       label: "Admin" },
  { value: "HR",          label: "HR" },
  { value: "ACCOUNTANT",  label: "Accountant" },
  { value: "MANAGER",     label: "Manager" },
  { value: "EMPLOYEE",    label: "Employee" },
];

const EDIT_STEPS = [
  { id: 1, label: "Personal Details",    icon: User },
  { id: 2, label: "Job Information",     icon: Briefcase },
  { id: 3, label: "Salary",             icon: TrendingUp },
  { id: 4, label: "Bank & Tax",         icon: Landmark },
  { id: 5, label: "Emergency Contacts", icon: Users },
  { id: 6, label: "Documents",          icon: FileCheck },
  { id: 7, label: "Agreements",         icon: FileSignature },
  { id: 8, label: "Access",             icon: ShieldCheck },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalaryCompEdit {
  id?: number;
  componentType: "earning" | "deduction";
  name: string;
  amount: number | string;
  isMandatory: boolean;
  isCustom: boolean;
  sortOrder: number;
  _key: string;
  _enabled: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1">
      {children}
    </p>
  );
}

function F({
  label, required, full, children,
}: {
  label: string; required?: boolean; full?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function CreatableSelect({
  value, onValueChange, options, placeholder = "Select or type…", disabled = false,
}: {
  value: string; onValueChange: (v: string) => void;
  options: string[]; placeholder?: string; disabled?: boolean;
}) {
  const isCustom = value !== "" && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customVal, setCustomVal]   = useState(isCustom ? value : "");

  if (showCustom) return (
    <div className="flex gap-2">
      <Input className="h-9 text-sm flex-1" placeholder="Type custom value…" value={customVal} disabled={disabled}
        onChange={e => { setCustomVal(e.target.value); onValueChange(e.target.value); }} />
      <button type="button" onClick={() => { setShowCustom(false); setCustomVal(""); onValueChange(""); }}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <Select value={value} onValueChange={v => { if (v === "__custom__") { setShowCustom(true); onValueChange(""); } else onValueChange(v ?? ""); }} disabled={disabled}>
      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}
        <SelectItem value="__custom__" className="text-sm text-primary font-medium">+ Add custom…</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmployeeEditPage() {
  const { uuid }   = useParams() as { uuid: string };
  const router     = useRouter();
  const sp         = useSearchParams();
  const photoRef   = useRef<HTMLInputElement>(null);
  const { user }   = useAuthStore();

  const canEdit   = HR_ROLES.includes(user?.role ?? "");
  const canSeeFin = FIN_ROLES.includes(user?.role ?? "");
  const isAdmin   = ADMIN_ROLES.includes(user?.role ?? "");
  const apiBase   = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

  const [step, setStep]         = useState(Math.min(Math.max(Number(sp.get("step") ?? 1), 1), 8));
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // ── Step 1: Personal ────────────────────────────────────────────────────────
  const [p1, setP1] = useState({
    name: "", personalEmail: "", phone: "", whatsappNumber: "",
    dateOfBirth: "", gender: "", maritalStatus: "", bloodGroup: "", nationality: "",
    educationQualification: "", schoolCollege: "",
    flatDoor: "", street: "", city: "", pinCode: "", state: "", country: "India",
  });
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const s1 = (k: string, v: string) => setP1(p => ({ ...p, [k]: v }));

  // ── Step 2: Job ─────────────────────────────────────────────────────────────
  const [p2, setP2] = useState({
    employeeType: "", workMode: "office", workLocation: "",
    joiningDate: "", probationEndDate: "", confirmationDate: "",
    shiftStart: "09:00", shiftEnd: "18:00",
    contractEndDate: "", contractRenewalReminder: "30",
    baseSalary: "", ctc: "",
  });
  const s2 = (k: string, v: string) => setP2(p => ({ ...p, [k]: v }));

  const [roleEntries, setRoleEntries] = useState([{ department: "", designation: "" }]);
  const [skillEntries, setSkillEntries] = useState<{ skill: string; expertiseLevel: string }[]>([]);

  function addRoleEntry() { setRoleEntries(p => [...p, { department: "", designation: "" }]); }
  function removeRoleEntry(i: number) { if (roleEntries.length > 1) setRoleEntries(p => p.filter((_, idx) => idx !== i)); }
  function updateRoleEntry(i: number, patch: Partial<{ department: string; designation: string }>) {
    setRoleEntries(p => p.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  }
  function addSkillEntry() { setSkillEntries(p => [...p, { skill: "", expertiseLevel: "" }]); }
  function removeSkillEntry(i: number) { setSkillEntries(p => p.filter((_, idx) => idx !== i)); }
  function updateSkillEntry(i: number, patch: Partial<{ skill: string; expertiseLevel: string }>) {
    setSkillEntries(p => p.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  }

  // ── Step 3: Salary components ────────────────────────────────────────────────
  const [salaryComps, setSalaryComps] = useState<SalaryCompEdit[]>([]);

  function updateComp(key: string, patch: Partial<SalaryCompEdit>) {
    setSalaryComps(p => p.map(c => c._key === key ? { ...c, ...patch } : c));
  }
  function removeComp(key: string) { setSalaryComps(p => p.filter(c => c._key !== key)); }
  function addCustomComp(type: "earning" | "deduction") {
    setSalaryComps(p => [...p, {
      componentType: type, name: "", amount: "", isMandatory: false,
      isCustom: true, sortOrder: 99, _key: `new_${Date.now()}`, _enabled: true,
    }]);
  }

  // ── Step 4: Bank & Tax ───────────────────────────────────────────────────────
  const [p4, setP4] = useState({
    bankName: "", accountHolderName: "", accountNumber: "",
    ifscCode: "", panNumber: "", aadhaarNumber: "", uanNumber: "", esicNumber: "",
  });
  const s4 = (k: string, v: string) => setP4(p => ({ ...p, [k]: v }));

  // ── Step 5: Emergency Contacts ───────────────────────────────────────────────
  const [contacts, setContacts] = useState([
    { name: "", relationship: "", phone: "", email: "" },
    { name: "", relationship: "", phone: "", email: "" },
  ]);
  function updateContact(i: number, k: string, v: string) {
    setContacts(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }

  // ── Step 6: Documents ────────────────────────────────────────────────────────
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({});
  const [docOptOpen, setDocOptOpen]     = useState(false);

  // ── Step 7: Agreements ───────────────────────────────────────────────────────
  const [agUploading, setAgUploading] = useState<Record<string, boolean>>({});

  // ── Step 8: Access ───────────────────────────────────────────────────────────
  const [roleValue, setRoleValue]   = useState("EMPLOYEE");
  const [savingRole, setSavingRole] = useState(false);
  const [toggling, setToggling]     = useState(false);

  // ── Load employee data ───────────────────────────────────────────────────────
  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<EmployeeDetail>>(`/employees/${uuid}`);
      const emp = res.data.data;
      setEmployee(emp);

      const addr = emp.address ?? {};
      setP1({
        name:                   emp.user.name                 ?? "",
        personalEmail:          emp.personalEmail             ?? "",
        phone:                  emp.phone                     ?? "",
        whatsappNumber:         (emp as typeof emp & { whatsappNumber?: string | null }).whatsappNumber ?? "",
        dateOfBirth:            emp.dateOfBirth               ?? "",
        gender:                 emp.gender                    ?? "",
        maritalStatus:          emp.maritalStatus             ?? "",
        bloodGroup:             emp.bloodGroup                ?? "",
        nationality:            emp.nationality               ?? "",
        educationQualification: emp.educationQualification    ?? "",
        schoolCollege:          emp.schoolCollege             ?? "",
        flatDoor:               addr.flatDoor                 ?? "",
        street:                 addr.street                   ?? "",
        city:                   addr.city                     ?? "",
        pinCode:                addr.pinCode                  ?? "",
        state:                  addr.state                    ?? "",
        country:                addr.country                  ?? "India",
      });

      setP2({
        employeeType:           emp.employeeType              ?? "",
        workMode:               emp.workMode                  ?? "office",
        workLocation:           emp.workLocation              ?? "",
        joiningDate:            emp.joiningDate               ?? "",
        probationEndDate:       emp.probationEndDate          ?? "",
        confirmationDate:       emp.confirmationDate          ?? "",
        shiftStart:             emp.shiftStart                ?? "09:00",
        shiftEnd:               emp.shiftEnd                  ?? "18:00",
        contractEndDate:        emp.contractEndDate           ?? "",
        contractRenewalReminder: String(emp.contractRenewalReminder ?? 30),
        baseSalary:             String(emp.baseSalary         ?? ""),
        ctc:                    String(emp.ctc               ?? ""),
      });
      setRoleEntries([{ department: emp.department ?? "", designation: emp.designation ?? "" }]);
      setSkillEntries((emp.skillTags ?? []).map(s => ({ skill: s, expertiseLevel: "" })));

      setSalaryComps(
        (emp.salaryComponents ?? []).map(c => ({
          ...c,
          _key: String(c.id ?? Math.random()),
          _enabled: true,
        }))
      );

      const bd = emp.bankDetails;
      setP4({
        bankName:          bd?.bankName          ?? "",
        accountHolderName: bd?.accountHolderName ?? "",
        accountNumber:     bd?.accountNumber     ?? "",
        ifscCode:          bd?.ifscCode          ?? "",
        panNumber:         bd?.panNumber         ?? "",
        aadhaarNumber:     bd?.aadhaarNumber     ?? "",
        uanNumber:         bd?.uanNumber         ?? "",
        esicNumber:        bd?.esicNumber        ?? "",
      });

      const ec = emp.emergencyContacts ?? [];
      setContacts([
        { name: ec[0]?.name ?? "", relationship: ec[0]?.relationship ?? "", phone: ec[0]?.phone ?? "", email: ec[0]?.email ?? "" },
        { name: ec[1]?.name ?? "", relationship: ec[1]?.relationship ?? "", phone: ec[1]?.phone ?? "", email: ec[1]?.email ?? "" },
      ]);

      setRoleValue(emp.user.role ?? "EMPLOYEE");
    } catch {
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      switch (step) {
        case 1:
          await api.patch(`/employees/${uuid}/personal`, {
            name:                   p1.name                   || null,
            personalEmail:          p1.personalEmail          || null,
            phone:                  p1.phone                  || null,
            whatsappNumber:         p1.whatsappNumber         || null,
            dateOfBirth:            p1.dateOfBirth            || null,
            gender:                 p1.gender                 || null,
            maritalStatus:          p1.maritalStatus          || null,
            bloodGroup:             p1.bloodGroup             || null,
            nationality:            p1.nationality            || null,
            educationQualification: p1.educationQualification || null,
            schoolCollege:          p1.schoolCollege          || null,
            address: {
              flatDoor: p1.flatDoor || null,
              street:   p1.street   || null,
              city:     p1.city     || null,
              pinCode:  p1.pinCode  || null,
              state:    p1.state    || null,
              country:  p1.country  || "India",
            },
          });
          if (photoFile) {
            const fd = new FormData();
            fd.append("photo", photoFile);
            await api.post(`/employees/${uuid}/photo`, fd);
          }
          break;

        case 2:
          await api.patch(`/employees/${uuid}/job`, {
            employeeType:            p2.employeeType                || null,
            workMode:                p2.workMode                    || null,
            workLocation:            p2.workLocation                || null,
            department:              roleEntries[0]?.department     || null,
            designation:             roleEntries[0]?.designation    || null,
            joiningDate:             p2.joiningDate                 || null,
            probationEndDate:        p2.probationEndDate            || null,
            confirmationDate:        p2.confirmationDate            || null,
            shiftStart:              p2.shiftStart                  || null,
            shiftEnd:                p2.shiftEnd                    || null,
            contractEndDate:         p2.contractEndDate             || null,
            contractRenewalReminder: Number(p2.contractRenewalReminder) || 30,
            baseSalary:              Number(p2.baseSalary)          || 0,
            ctc:                     Number(p2.ctc)                 || null,
            skillTags:               skillEntries.filter(e => e.skill.trim()).map(e => e.skill),
          });
          break;

        case 3:
          await api.patch(`/employees/${uuid}/salary`, {
            components: salaryComps
              .filter(c => c._enabled)
              .map((c, i) => ({
                componentType: c.componentType,
                name:          c.name,
                amount:        Number(c.amount) || 0,
                isMandatory:   c.isMandatory,
                isCustom:      c.isCustom,
                sortOrder:     i + 1,
              })),
          });
          break;

        case 4:
          await api.patch(`/employees/${uuid}/bank`, {
            bankName:          p4.bankName          || null,
            accountHolderName: p4.accountHolderName || null,
            accountNumber:     p4.accountNumber     || null,
            ifscCode:          p4.ifscCode          || null,
            panNumber:         p4.panNumber         || null,
            aadhaarNumber:     p4.aadhaarNumber     || null,
            uanNumber:         p4.uanNumber         || null,
            esicNumber:        p4.esicNumber        || null,
          });
          break;

        case 5:
          await api.patch(`/employees/${uuid}/emergency-contacts`, {
            contacts: contacts
              .filter(c => c.name.trim() && c.phone.trim())
              .map((c, i) => ({ contactOrder: i + 1, ...c })),
          });
          break;
      }
      toast.success("Changes saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchEmployee();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Document upload ──────────────────────────────────────────────────────────
  async function uploadDoc(slotName: string, docType: string, isMandatory: boolean, file: File) {
    setDocUploading(p => ({ ...p, [slotName]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", slotName);
      fd.append("docType", docType);
      fd.append("docCategory", "other");
      fd.append("isMandatory", String(isMandatory));
      await api.post(`/employees/${uuid}/documents`, fd);
      toast.success(`${slotName} uploaded`);
      fetchEmployee();
    } catch { toast.error("Upload failed"); }
    finally { setDocUploading(p => ({ ...p, [slotName]: false })); }
  }

  // ── Agreement upload ─────────────────────────────────────────────────────────
  async function uploadAgreement(agreementType: string, name: string, file: File) {
    setAgUploading(p => ({ ...p, [agreementType]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("agreementType", agreementType);
      fd.append("name", name);
      fd.append("version", "v1");
      await api.post(`/employees/${uuid}/agreements`, fd);
      toast.success(`${name} uploaded`);
      fetchEmployee();
    } catch { toast.error("Upload failed"); }
    finally { setAgUploading(p => ({ ...p, [agreementType]: false })); }
  }

  // ── Role / account actions ───────────────────────────────────────────────────
  async function saveRole() {
    setSavingRole(true);
    try {
      await api.put(`/users/${employee?.user.id}`, { role: roleValue });
      toast.success("Role updated");
      fetchEmployee();
    } catch { toast.error("Failed to update role"); }
    finally { setSavingRole(false); }
  }

  async function toggleAccount() {
    if (!employee) return;
    const isActive = employee.user.status === "ACTIVE";
    setToggling(true);
    try {
      await api.patch(`/users/${employee.user.id}/status`, {
        status: isActive ? "INACTIVE" : "ACTIVE",
      });
      toast.success(`Account ${isActive ? "deactivated" : "activated"}`);
      fetchEmployee();
    } catch { toast.error("Failed to update account status"); }
    finally { setToggling(false); }
  }

  // ── Render step form ─────────────────────────────────────────────────────────
  function renderStepForm() {
    if (!employee) return null;

    // ── Step 1: Personal Details ──
    if (step === 1) return (
      <div className="space-y-6">
        <div>
          <SectionTitle>Identity</SectionTitle>
          {/* Photo */}
          <div className="flex items-center gap-4 mb-4">
            <button type="button" onClick={() => photoRef.current?.click()}
              className="relative w-16 h-16 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all shrink-0 overflow-hidden group">
              {photoPreview || resolveAssetUrl(employee.user.avatarUrl) ? (
                <img src={photoPreview ?? resolveAssetUrl(employee.user.avatarUrl)!}
                  alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </span>
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhotoFile(f);
                setPhotoPreview(URL.createObjectURL(f));
              }} />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Profile Photo</p>
              <p>Click to {employee.user.avatarUrl ? "change" : "upload"} · JPG, PNG up to 5 MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Full Name" required>
              <Input className="h-9 text-sm" value={p1.name} onChange={e => s1("name", e.target.value)} required />
            </F>
            <F label="Date of Birth">
              <Input type="date" className="h-9 text-sm" value={p1.dateOfBirth} onChange={e => s1("dateOfBirth", e.target.value)} />
            </F>
            <F label="Gender">
              <Select value={p1.gender} onValueChange={v => s1("gender", v ?? "")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDER_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-sm">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Marital Status">
              <Select value={p1.maritalStatus} onValueChange={v => s1("maritalStatus", v ?? "")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-sm">{MARITAL_LABELS[o]}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Blood Group">
              <Select value={p1.bloodGroup} onValueChange={v => s1("bloodGroup", v ?? "")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(g => <SelectItem key={g} value={g} className="text-sm">{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Nationality">
              <Input className="h-9 text-sm" value={p1.nationality} onChange={e => s1("nationality", e.target.value)} />
            </F>
          </div>
        </div>

        <div>
          <SectionTitle>Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="Personal Email">
              <Input type="email" className="h-9 text-sm" value={p1.personalEmail} onChange={e => s1("personalEmail", e.target.value)} />
            </F>
            <F label="Phone">
              <Input className="h-9 text-sm" value={p1.phone} onChange={e => s1("phone", e.target.value)} />
            </F>
            <F label="WhatsApp Number" full>
              <Input className="h-9 text-sm" placeholder="+91 98765 43210" value={p1.whatsappNumber} onChange={e => s1("whatsappNumber", e.target.value)} />
            </F>
          </div>
        </div>

        <div>
          <SectionTitle>Background</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="Education Qualification">
              <Input className="h-9 text-sm" placeholder="e.g. B.Tech, MBA" value={p1.educationQualification} onChange={e => s1("educationQualification", e.target.value)} />
            </F>
            <F label="School / College">
              <Input className="h-9 text-sm" value={p1.schoolCollege} onChange={e => s1("schoolCollege", e.target.value)} />
            </F>
          </div>
        </div>

        <div>
          <SectionTitle>Address</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="Flat / Door No.">
              <Input className="h-9 text-sm" value={p1.flatDoor} onChange={e => s1("flatDoor", e.target.value)} />
            </F>
            <F label="PIN Code">
              <Input className="h-9 text-sm" value={p1.pinCode} onChange={e => s1("pinCode", e.target.value)} />
            </F>
            <F label="Street / Area" full>
              <Input className="h-9 text-sm" value={p1.street} onChange={e => s1("street", e.target.value)} />
            </F>
            <F label="City">
              <Input className="h-9 text-sm" value={p1.city} onChange={e => s1("city", e.target.value)} />
            </F>
            <F label="State">
              <Input className="h-9 text-sm" value={p1.state} onChange={e => s1("state", e.target.value)} />
            </F>
            <F label="Country">
              <Input className="h-9 text-sm" value={p1.country} onChange={e => s1("country", e.target.value)} />
            </F>
          </div>
        </div>
      </div>
    );

    // ── Step 2: Job Information ──
    if (step === 2) {
      const isContract     = CONTRACT_TYPES.has(p2.employeeType);
      const lastDesig      = [...roleEntries].reverse().find(r => r.designation)?.designation ?? "";
      const suggestedSkills = lastDesig ? (DESIGNATION_SKILLS[lastDesig] ?? []) : [];
      const skillsEnabled  = roleEntries.some(r => r.designation.trim() !== "");

      return (
        <div className="space-y-6">
          <div>
            <SectionTitle>Role</SectionTitle>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <F label="Employee Type">
                <Select value={p2.employeeType} onValueChange={v => s2("employeeType", v ?? "")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EMP_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Work Mode">
                <Select value={p2.workMode} onValueChange={v => { s2("workMode", v ?? ""); if (v === "remote") s2("workLocation", ""); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office" className="text-sm">Office</SelectItem>
                    <SelectItem value="remote" className="text-sm">Remote</SelectItem>
                    <SelectItem value="hybrid" className="text-sm">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Work Location" full>
                <Input className="h-9 text-sm" placeholder="Office Location"
                  disabled={!["office", "hybrid"].includes(p2.workMode)}
                  value={p2.workLocation} onChange={e => s2("workLocation", e.target.value)} />
              </F>
            </div>

            {/* Department & Designation — multiple entries */}
            <div className="space-y-2 mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Department & Designation <span className="text-destructive">*</span>
              </p>
              {roleEntries.map((entry, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-3 space-y-3 relative">
                  {roleEntries.length > 1 && (
                    <button type="button" onClick={() => removeRoleEntry(i)}
                      className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 pr-8">
                    <F label={i === 0 ? "Department *" : "Department"}>
                      <CreatableSelect value={entry.department}
                        onValueChange={v => updateRoleEntry(i, { department: v, designation: "" })}
                        options={ALL_DEPARTMENTS} placeholder="Select department…" />
                    </F>
                    <F label={i === 0 ? "Designation *" : "Designation"}>
                      <CreatableSelect value={entry.designation}
                        onValueChange={v => updateRoleEntry(i, { designation: v })}
                        options={entry.department ? (DEPT_DESIGNATION[entry.department] ?? []) : []}
                        disabled={!entry.department}
                        placeholder={entry.department ? "Select designation…" : "Select department first"} />
                    </F>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addRoleEntry}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors border border-dashed border-primary/30">
                <Plus className="w-3.5 h-3.5" /> Add Role
              </button>
            </div>

            {/* Skillset */}
            <div className="border-t border-border/50 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Skillset
                {!skillsEnabled && <span className="normal-case font-normal ml-1 text-muted-foreground/60"> — select a designation above to enable</span>}
              </p>
              {skillEntries.map((entry, i) => (
                <div key={i} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <F label="Skill / Tool">
                      <CreatableSelect value={entry.skill}
                        onValueChange={v => updateSkillEntry(i, { skill: v })}
                        options={suggestedSkills} disabled={!skillsEnabled}
                        placeholder={skillsEnabled ? "Select or type skill…" : "Select designation first"} />
                    </F>
                  </div>
                  <div className="w-36">
                    <F label="Expertise">
                      <Select value={entry.expertiseLevel}
                        onValueChange={v => updateSkillEntry(i, { expertiseLevel: v ?? "" })}
                        disabled={!skillsEnabled}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Level" /></SelectTrigger>
                        <SelectContent>
                          {EXPERTISE_LEVELS.map(l => <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                  </div>
                  <button type="button" onClick={() => removeSkillEntry(i)}
                    className="mb-0.5 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSkillEntry} disabled={!skillsEnabled}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors border border-dashed border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>
          </div>

          <div>
            <SectionTitle>Schedule & Dates</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <F label="Joining Date" required>
                <Input type="date" className="h-9 text-sm" value={p2.joiningDate} onChange={e => s2("joiningDate", e.target.value)} />
              </F>
              <F label="Probation End">
                <Input type="date" className="h-9 text-sm" value={p2.probationEndDate} onChange={e => s2("probationEndDate", e.target.value)} />
              </F>
              <F label="Confirmation Date">
                <Input type="date" className="h-9 text-sm" value={p2.confirmationDate} onChange={e => s2("confirmationDate", e.target.value)} />
              </F>
              <F label="Shift Start">
                <Input type="time" className="h-9 text-sm" value={p2.shiftStart} onChange={e => s2("shiftStart", e.target.value)} />
              </F>
              <F label="Shift End">
                <Input type="time" className="h-9 text-sm" value={p2.shiftEnd} onChange={e => s2("shiftEnd", e.target.value)} />
              </F>
            </div>
          </div>

          {isContract && (
            <div>
              <SectionTitle>Contract</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <F label="Contract End Date">
                  <Input type="date" className="h-9 text-sm" value={p2.contractEndDate} onChange={e => s2("contractEndDate", e.target.value)} />
                </F>
                <F label="Renewal Reminder (days)">
                  <Input type="number" min={1} className="h-9 text-sm" value={p2.contractRenewalReminder} onChange={e => s2("contractRenewalReminder", e.target.value)} />
                </F>
              </div>
            </div>
          )}

          <div>
            <SectionTitle>Compensation</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <F label="Base Salary (₹/mo)">
                <Input type="number" min={0} className="h-9 text-sm" value={p2.baseSalary} onChange={e => s2("baseSalary", e.target.value)} />
              </F>
              <F label="CTC (Annual ₹)">
                <Input type="number" min={0} className="h-9 text-sm" value={p2.ctc} onChange={e => s2("ctc", e.target.value)} />
              </F>
            </div>
          </div>
        </div>
      );
    }

    // ── Step 3: Salary components ──
    if (step === 3) {
      const earnings   = salaryComps.filter(c => c.componentType === "earning");
      const deductions = salaryComps.filter(c => c.componentType === "deduction");
      const gross = earnings  .filter(c => c._enabled).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const deduc = deductions.filter(c => c._enabled).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const net   = gross - deduc;
      const fmt   = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

      function CompList({ type, items }: { type: "earning" | "deduction"; items: SalaryCompEdit[] }) {
        const isEarning = type === "earning";
        return (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-3.5 border-b border-border ${isEarning ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
              <p className={`text-xs font-semibold ${isEarning ? "text-emerald-700" : "text-red-600"}`}>
                {isEarning ? "Earnings" : "Deductions"}
              </p>
              <span className={`text-sm font-bold font-mono ${isEarning ? "text-emerald-600" : "text-red-500"}`}>
                ₹{fmt(isEarning ? gross : deduc)}
              </span>
            </div>
            <div className="px-3 divide-y divide-border/40">
              {items.map(c => (
                <div key={c._key} className={`flex items-center gap-2 py-2.5 transition-opacity ${!c._enabled && !c.isMandatory ? "opacity-40" : ""}`}>
                  {c.isMandatory
                    ? <div className="w-4 h-4 shrink-0" />
                    : <input type="checkbox" checked={c._enabled} onChange={() => updateComp(c._key, { _enabled: !c._enabled })}
                        className="w-4 h-4 accent-primary shrink-0 cursor-pointer" />
                  }
                  {c.isCustom
                    ? <Input className="h-7 text-xs flex-1" placeholder="Component name" value={c.name}
                        onChange={e => updateComp(c._key, { name: e.target.value })} />
                    : <span className="flex-1 text-xs text-foreground/80 truncate">
                        {c.name}
                        {c.isMandatory && <span className="ml-1 text-[10px] text-primary/60 bg-primary/8 px-1 rounded">req</span>}
                      </span>
                  }
                  <Input type="number" min={0}
                    className="h-7 text-xs w-28 text-right font-mono"
                    placeholder="0"
                    value={c.amount}
                    disabled={!c._enabled && !c.isMandatory}
                    onChange={e => updateComp(c._key, { amount: e.target.value })} />
                  {c.isCustom
                    ? <button type="button" onClick={() => removeComp(c._key)} className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    : <div className="w-3.5 h-3.5 shrink-0" />
                  }
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <Button type="button" variant="ghost" size="sm"
                className="h-7 text-xs w-full text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30"
                onClick={() => addCustomComp(type)}>
                <Plus className="w-3 h-3 mr-1" /> Add Custom {isEarning ? "Earning" : "Deduction"}
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CompList type="earning"   items={earnings} />
            <CompList type="deduction" items={deductions} />
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 grid grid-cols-3 divide-x divide-border">
            {[
              ["Gross Earnings",   `₹${fmt(gross)}`, "text-emerald-600"],
              ["Total Deductions", `₹${fmt(deduc)}`, "text-red-500"],
              ["Net Take-Home",    `₹${fmt(net)}`,   "text-foreground"],
            ].map(([l, v, c]) => (
              <div key={l} className="px-5 py-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{l}</p>
                <p className={`text-lg font-bold font-mono ${c}`}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Step 4: Bank & Tax ──
    if (step === 4) return (
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <Landmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">All bank and tax information is encrypted at rest.</p>
        </div>

        <div>
          <SectionTitle>Bank Account</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="Bank Name">
              <Input className="h-9 text-sm" placeholder="e.g. HDFC Bank" value={p4.bankName} onChange={e => s4("bankName", e.target.value)} />
            </F>
            <F label="Account Holder Name">
              <Input className="h-9 text-sm" placeholder="As per bank records" value={p4.accountHolderName} onChange={e => s4("accountHolderName", e.target.value)} />
            </F>
            <F label="Account Number">
              <Input className="h-9 text-sm font-mono tracking-wider" placeholder="Account number" value={p4.accountNumber} onChange={e => s4("accountNumber", e.target.value)} />
            </F>
            <F label="IFSC Code">
              <Input className="h-9 text-sm font-mono uppercase tracking-wider" maxLength={11} placeholder="HDFC0001234" value={p4.ifscCode} onChange={e => s4("ifscCode", e.target.value.toUpperCase())} />
            </F>
          </div>
        </div>

        <div>
          <SectionTitle>Tax & Identity</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="PAN Number">
              <Input className="h-9 text-sm font-mono uppercase tracking-widest" placeholder="ABCDE1234F" maxLength={10} value={p4.panNumber} onChange={e => s4("panNumber", e.target.value.toUpperCase())} />
            </F>
            <F label="Aadhaar Number">
              <Input className="h-9 text-sm font-mono tracking-widest" placeholder="12-digit Aadhaar" maxLength={12} value={p4.aadhaarNumber} onChange={e => s4("aadhaarNumber", e.target.value.replace(/\D/g, ""))} />
            </F>
          </div>
        </div>

        <div>
          <SectionTitle>Statutory</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <F label="UAN Number">
              <Input className="h-9 text-sm font-mono" placeholder="Universal Account No." value={p4.uanNumber} onChange={e => s4("uanNumber", e.target.value)} />
            </F>
            <F label="ESIC Number">
              <Input className="h-9 text-sm font-mono" placeholder="ESIC No." value={p4.esicNumber} onChange={e => s4("esicNumber", e.target.value)} />
            </F>
          </div>
        </div>
      </div>
    );

    // ── Step 5: Emergency Contacts ──
    if (step === 5) return (
      <div className="space-y-4">
        {contacts.map((c, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-primary" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Contact {i + 1}</p>
                <p className="text-[11px] text-muted-foreground">{i === 0 ? "Primary emergency contact" : "Secondary emergency contact"}</p>
              </div>
              {c.name && <span className="ml-auto text-xs text-muted-foreground font-medium truncate max-w-[140px]">{c.name}</span>}
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <F label={i === 0 ? "Full Name *" : "Full Name"}>
                <Input className="h-9 text-sm" placeholder="Contact name" value={c.name} onChange={e => updateContact(i, "name", e.target.value)} />
              </F>
              <F label="Relationship">
                <Select value={c.relationship} onValueChange={v => updateContact(i, "relationship", v ?? "")}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(r => <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label={i === 0 ? "Phone *" : "Phone"}>
                <Input className="h-9 text-sm" placeholder="+91 98765 43210" value={c.phone} onChange={e => updateContact(i, "phone", e.target.value)} />
              </F>
              <F label="Email">
                <Input type="email" className="h-9 text-sm" placeholder="email@example.com" value={c.email} onChange={e => updateContact(i, "email", e.target.value)} />
              </F>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 border border-border">
          Contact details are kept confidential and used only in emergencies.
        </p>
      </div>
    );

    // ── Step 6: Documents ──
    if (step === 6) {
      const docs = employee.documents ?? [];
      const mandatoryUploaded = MANDATORY_DOC_SLOTS.filter(
        s => docs.some(d => d.name?.toLowerCase() === s.slotName.toLowerCase())
      ).length;

      function DocRow({ slotName, docType, isMandatory }: { slotName: string; docType: string; isMandatory: boolean }) {
        const doc = docs.find(d => d.name?.toLowerCase() === slotName.toLowerCase());
        const id  = `doc-${slotName.replace(/[\s/]/g, "-")}`;
        const busy = docUploading[slotName];
        return (
          <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${doc ? "text-emerald-500" : "text-muted-foreground/25"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{slotName}</p>
              {doc
                ? <p className="text-[11px] text-emerald-600 mt-0.5">Uploaded · {fmt(doc.createdAt)}</p>
                : <p className="text-[11px] text-muted-foreground mt-0.5">PDF, JPG, PNG — max 5MB</p>}
            </div>
            <input id={id} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(slotName, docType, isMandatory, f); e.currentTarget.value = ""; }} />
            <label htmlFor={id}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all select-none
                ${doc ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40"}
                ${busy ? "pointer-events-none opacity-60" : ""}`}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {busy ? "Uploading…" : doc ? "Change" : "Upload"}
            </label>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileCheck className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Mandatory Documents</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Required for compliance and onboarding</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mandatoryUploaded >= MANDATORY_DOC_SLOTS.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {mandatoryUploaded} / {MANDATORY_DOC_SLOTS.length}
              </span>
            </div>
            <div className="px-5">
              {MANDATORY_DOC_SLOTS.map(s => <DocRow key={s.slotName} slotName={s.slotName} docType={s.docType} isMandatory={true} />)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button type="button" className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              onClick={() => setDocOptOpen(v => !v)}>
              <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-foreground">Optional Documents</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Passport, experience certificates, etc.</p>
              </div>
              {docOptOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {docOptOpen && (
              <div className="px-5 border-t border-border">
                {OPTIONAL_DOC_SLOTS.map(s => <DocRow key={s.slotName} slotName={s.slotName} docType={s.docType} isMandatory={false} />)}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Step 7: Agreements ──
    if (step === 7) {
      const agreements = employee.agreements ?? [];
      const uploadedCount = AGREEMENT_SLOTS.filter(s => agreements.some(a => a.agreementType === s.agreementType)).length;
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileSignature className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Signed Agreements</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">All are optional — upload when signed</p>
              </div>
              {uploadedCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {uploadedCount} uploaded
                </span>
              )}
            </div>
            <div className="px-5">
              {AGREEMENT_SLOTS.map(({ agreementType, name }) => {
                const ag   = agreements.find(a => a.agreementType === agreementType);
                const id   = `ag-${agreementType}`;
                const busy = agUploading[agreementType];
                return (
                  <div key={agreementType} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${ag ? "text-emerald-500" : "text-muted-foreground/25"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {ag
                        ? <p className="text-[11px] text-emerald-600 mt-0.5">{ag.version ?? "v1"} · Uploaded {fmt(ag.createdAt)}</p>
                        : <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOCX — max 10MB</p>}
                    </div>
                    <input id={id} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadAgreement(agreementType, name, f); e.currentTarget.value = ""; }} />
                    <label htmlFor={id}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all select-none
                        ${ag ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40"}
                        ${busy ? "pointer-events-none opacity-60" : ""}`}>
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {busy ? "Uploading…" : ag ? "Change" : "Upload"}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // ── Step 8: Access ──
    if (step === 8) {
      const isActive = employee.user.status === "ACTIVE";
      return (
        <div className="space-y-4">
          {/* System Account card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </span>
              <p className="text-xs font-semibold text-foreground flex-1">System Account</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {employee.user.status ?? "INACTIVE"}
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Email (Login)</p>
                <p className="text-sm text-foreground mt-0.5 font-mono">{employee.user.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Role</p>
                <p className="text-sm text-foreground mt-0.5">{ACCESS_ROLES.find(r => r.value === employee.user.role)?.label ?? employee.user.role ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Last Login</p>
                <p className="text-sm text-foreground mt-0.5">{employee.user.lastLoginAt ? fmt(employee.user.lastLoginAt) : "Never"}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Account Status</p>
                <p className="text-sm text-foreground mt-0.5">{isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <Button variant="outline" size="sm"
                className={`h-8 text-xs gap-1.5 ${isActive ? "text-red-600 hover:bg-red-50 hover:border-red-200" : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"}`}
                onClick={toggleAccount} disabled={toggling}>
                {isActive
                  ? <><PowerOff className="w-3.5 h-3.5" /> {toggling ? "Deactivating…" : "Deactivate Account"}</>
                  : <><Power    className="w-3.5 h-3.5" /> {toggling ? "Activating…"   : "Activate Account"}</>}
              </Button>
            </div>
          </div>

          {/* Role Permissions card — clickable list */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </span>
              <p className="text-xs font-semibold text-foreground flex-1">Role Permissions</p>
              <p className="text-[11px] text-muted-foreground">Click a role to select</p>
            </div>
            <div className="p-5 space-y-2">
              {ACCESS_ROLES.map(r => {
                const isSelected = roleValue === r.value;
                const isCurrent  = employee.user.role === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setRoleValue(r.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors text-left ${
                      isSelected ? "border-primary/30 bg-primary/5" : "border-border bg-transparent hover:bg-muted/40"
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-primary" : "bg-muted-foreground/25"}`} />
                    <p className={`text-xs font-medium flex-1 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{r.label}</p>
                    {isCurrent && !isSelected && <span className="text-[10px] text-muted-foreground">Current</span>}
                    {isSelected && <span className="text-[10px] text-primary font-semibold">{isCurrent ? "Current" : "Selected"}</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-5 flex items-center gap-3 border-t border-border pt-4">
              <Button onClick={saveRole} disabled={savingRole || roleValue === employee.user.role} className="h-8 text-xs gap-1.5">
                {savingRole ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : "Save Role"}
              </Button>
              <p className="text-[11px] text-muted-foreground">Takes effect immediately.</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ── Loading / not found ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!employee) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <p className="text-sm text-muted-foreground">Employee not found.</p>
      <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
    </div>
  );

  const currentStepInfo = EDIT_STEPS.find(s => s.id === step)!;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/employees/${uuid}`)}
              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">Edit Employee</h1>
              <p className="text-xs text-muted-foreground">{employee.user.name} · {employee.employeeCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => router.push(`/employees/${uuid}`)}>
              Back to Profile
            </Button>
            {step <= 5 && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : saved
                    ? <><Check className="w-3.5 h-3.5" /> Saved</>
                    : "Save Changes"
                }
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-border min-h-[calc(100vh-65px)] bg-card/50 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-1">
            Edit Sections
          </p>
          {EDIT_STEPS.map(s => {
            const Icon = s.icon;
            const active = step === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-colors mb-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Form area */}
        <div className="flex-1 p-6 max-w-3xl">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-foreground">{currentStepInfo.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Make changes below then click <span className="font-medium text-foreground">Save Changes</span> to apply.
            </p>
          </div>

          {renderStepForm()}

          {/* Bottom save bar */}
          <div className="mt-8 pt-5 border-t border-border flex items-center gap-3">
            {step <= 5 && (
              <Button onClick={handleSave} disabled={saving} className="h-9 text-sm gap-1.5">
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : saved
                    ? <><Check className="w-3.5 h-3.5" /> Saved</>
                    : "Save Changes"
                }
              </Button>
            )}
            <Button variant="outline" className="h-9 text-sm"
              onClick={() => router.push(`/employees/${uuid}`)}>
              Back to Profile
            </Button>
            {step < 8 && (
              <Button variant="ghost" className="h-9 text-sm text-muted-foreground ml-auto"
                onClick={() => setStep(s => Math.min(s + 1, 8))}>
                Next Section →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
