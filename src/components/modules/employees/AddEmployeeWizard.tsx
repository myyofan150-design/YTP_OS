"use client";

// src/components/modules/employees/AddEmployeeWizard.tsx

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types";

import { Step1PersonalDetails } from "./wizard-steps/Step1PersonalDetails";
import { Step2JobInformation }  from "./wizard-steps/Step2JobInformation";
import { Step3SalaryStructure } from "./wizard-steps/Step3SalaryStructure";
import { Step4BankTax }         from "./wizard-steps/Step4BankTax";
import { Step5EmergencyContacts } from "./wizard-steps/Step5EmergencyContacts";
import { Step6Documents }       from "./wizard-steps/Step6Documents";
import { Step7Agreements }      from "./wizard-steps/Step7Agreements";
import { Step8SystemAccess }    from "./wizard-steps/Step8SystemAccess";
import { Step9ReviewSubmit }    from "./wizard-steps/Step9ReviewSubmit";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface EducationEntry {
  qualification: string;
  schoolCollege: string;
  percentage: string;
}

export interface RoleEntry {
  department: string;
  designation: string;
}

export interface SkillEntry {
  skill: string;
  expertiseLevel: string;
}

export interface SalaryComponentForm {
  id: string;
  componentType: "earning" | "deduction";
  name: string;
  amount: string;
  isMandatory: boolean;
  isCustom: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface EmergencyContactForm {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  contactOrder: number;
}

export interface DocSlotForm {
  slot: string;
  docType: string;
  category: string;
  isMandatory: boolean;
  fileName: string | null;
}

export interface AgreementSlotForm {
  agreementType: string;
  name: string;
  fileName: string | null;
}

export interface SubmitState {
  status: "idle" | "creating" | "uploading-docs" | "uploading-agreements" | "done" | "error";
  message: string;
}

export interface WizardFormData {
  // Step 1 — Personal
  name: string;
  personalEmail: string;
  phone: string;
  whatsappNumber: string;
  dateOfBirth: string;
  gender: string;
  photoPreviewUrl: string;
  maritalStatus: string;
  nationality: string;
  bloodGroup: string;
  educationEntries: EducationEntry[];
  // current address
  flatDoor: string;
  street: string;
  city: string;
  pinCode: string;
  state: string;
  country: string;
  // permanent address
  permFlatDoor: string;
  permStreet: string;
  permCity: string;
  permPinCode: string;
  permState: string;
  permCountry: string;
  // Step 2 — Job
  employeeType: string;
  roleEntries: RoleEntry[];
  department: string;
  designation: string;
  reportingManagerId: string;
  joiningDate: string;
  probationEndDate: string;
  confirmationDate: string;
  shiftStart: string;
  shiftEnd: string;
  workMode: string;
  workLocation: string;
  contractEndDate: string;
  contractRenewalReminder: string;
  skillEntries: SkillEntry[];
  skillTags: string[];
  baseSalary: string;
  ctc: string;
  // Step 3 — Salary
  salaryComponents: SalaryComponentForm[];
  // Step 4 — Bank
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esicNumber: string;
  // Step 5 — Emergency
  emergencyContacts: EmergencyContactForm[];
  // Step 6 — Docs (file names only — files in fileData)
  docSlots: DocSlotForm[];
  // Step 7 — Agreements (file names only)
  agreementSlots: AgreementSlotForm[];
  // Step 8 — System Access
  createAccount: boolean;
  accountEmail: string;
  tempPassword: string;
  role: string;
}

export interface StepProps {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  fileData: Record<string, File>;
  setFileData: (key: string, file: File | null) => void;
  onGoToStep?: (step: number) => void;
  onSubmit?: () => void;
  submitState?: SubmitState;
  validationErrors?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "emp_wizard_draft";

const STEP_LABELS = [
  "Personal Details",
  "Job Information",
  "Salary Structure",
  "Bank & Tax",
  "Emergency Contacts",
  "Documents",
  "Agreements",
  "System Access",
  "Review & Submit",
];

const DEFAULT_SALARY: SalaryComponentForm[] = [
  { id: "e1", componentType: "earning",   name: "Basic Salary",         amount: "", isMandatory: true,  isCustom: false, enabled: true,  sortOrder: 1 },
  { id: "e2", componentType: "earning",   name: "HRA",                  amount: "", isMandatory: true,  isCustom: false, enabled: true,  sortOrder: 2 },
  { id: "e3", componentType: "earning",   name: "Travel Allowance",     amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 3 },
  { id: "e4", componentType: "earning",   name: "Conveyance Allowance", amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 4 },
  { id: "e5", componentType: "earning",   name: "Medical Allowance",    amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 5 },
  { id: "e6", componentType: "earning",   name: "Internet Allowance",   amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 6 },
  { id: "e7", componentType: "earning",   name: "Performance Incentive",amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 7 },
  { id: "e8", componentType: "earning",   name: "Special Allowance",    amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 8 },
  { id: "d1", componentType: "deduction", name: "PF",                   amount: "", isMandatory: true,  isCustom: false, enabled: true,  sortOrder: 1 },
  { id: "d2", componentType: "deduction", name: "ESI",                  amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 2 },
  { id: "d3", componentType: "deduction", name: "Professional Tax",     amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 3 },
  { id: "d4", componentType: "deduction", name: "TDS",                  amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 4 },
  { id: "d5", componentType: "deduction", name: "Advance Recovery",     amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 5 },
  { id: "d6", componentType: "deduction", name: "Loan Deduction",       amount: "", isMandatory: false, isCustom: false, enabled: false, sortOrder: 6 },
];

const DEFAULT_DOC_SLOTS: DocSlotForm[] = [
  { slot: "Aadhaar Card",                    docType: "ID_PROOF", category: "identity",  isMandatory: true,  fileName: null },
  { slot: "PAN Card",                        docType: "ID_PROOF", category: "identity",  isMandatory: true,  fileName: null },
  { slot: "Bank Passbook / Cancelled Cheque", docType: "OTHER",   category: "banking",   isMandatory: true,  fileName: null },
  { slot: "Highest Education Certificate",   docType: "OTHER",    category: "education", isMandatory: true,  fileName: null },
  { slot: "Passport",                        docType: "ID_PROOF", category: "identity",  isMandatory: false, fileName: null },
  { slot: "Experience Certificate",          docType: "OTHER",    category: "experience",isMandatory: false, fileName: null },
  { slot: "Last 3 Payslips",                 docType: "OTHER",    category: "experience",isMandatory: false, fileName: null },
  { slot: "Relieving Letter",                docType: "OTHER",    category: "experience",isMandatory: false, fileName: null },
  { slot: "Skill Certificates",              docType: "OTHER",    category: "other",     isMandatory: false, fileName: null },
];

const DEFAULT_AGREEMENT_SLOTS: AgreementSlotForm[] = [
  { agreementType: "offer_letter",         name: "Offer Letter",         fileName: null },
  { agreementType: "appointment_letter",   name: "Appointment Letter",   fileName: null },
  { agreementType: "nda",                  name: "NDA",                  fileName: null },
  { agreementType: "employment_agreement", name: "Employment Agreement", fileName: null },
  { agreementType: "leave_policy",         name: "Leave Policy",         fileName: null },
  { agreementType: "it_policy",            name: "IT Policy",            fileName: null },
  { agreementType: "code_of_conduct",      name: "Code of Conduct",      fileName: null },
];

const INITIAL_FORM: WizardFormData = {
  name: "", personalEmail: "", phone: "", whatsappNumber: "",
  dateOfBirth: "", gender: "", photoPreviewUrl: "",
  maritalStatus: "", nationality: "", bloodGroup: "",
  educationEntries: [{ qualification: "", schoolCollege: "", percentage: "" }],
  flatDoor: "", street: "", city: "", pinCode: "", state: "", country: "India",
  permFlatDoor: "", permStreet: "", permCity: "", permPinCode: "", permState: "", permCountry: "India",
  employeeType: "full_time",
  roleEntries: [{ department: "", designation: "" }],
  department: "", designation: "", reportingManagerId: "",
  joiningDate: "", probationEndDate: "", confirmationDate: "",
  shiftStart: "09:00", shiftEnd: "18:00",
  workMode: "office", workLocation: "",
  contractEndDate: "", contractRenewalReminder: "30",
  skillEntries: [], skillTags: [], baseSalary: "", ctc: "",
  salaryComponents: DEFAULT_SALARY,
  bankName: "", accountNumber: "", accountHolderName: "",
  ifscCode: "", panNumber: "", aadhaarNumber: "", uanNumber: "", esicNumber: "",
  emergencyContacts: [
    { name: "", relationship: "Parent", phone: "", email: "", contactOrder: 1 },
    { name: "", relationship: "Spouse", phone: "", email: "", contactOrder: 2 },
  ],
  docSlots: DEFAULT_DOC_SLOTS,
  agreementSlots: DEFAULT_AGREEMENT_SLOTS,
  createAccount: true, accountEmail: "", tempPassword: "", role: "EMPLOYEE",
};

// ─── Validation ───────────────────────────────────────────────────────────────

export function getValidationErrors(fd: WizardFormData): string[] {
  const e: string[] = [];
  if (!fd.name.trim())           e.push("Full Name is required (Step 1)");
  if (!fd.personalEmail.trim())  e.push("Personal Email is required (Step 1)");
  if (!fd.phone.trim())          e.push("Phone is required (Step 1)");
  if (!fd.whatsappNumber.trim()) e.push("WhatsApp Number is required (Step 1)");
  if (!fd.dateOfBirth)           e.push("Date of Birth is required (Step 1)");
  if (!fd.gender)                e.push("Gender is required (Step 1)");
  if (!fd.educationEntries[0]?.qualification?.trim())
    e.push("At least one Education Qualification is required (Step 1)");
  if (!fd.permCity.trim())       e.push("Permanent Address (City) is required (Step 1)");
  if (!fd.employeeType)          e.push("Employee Type is required (Step 2)");
  if (!fd.roleEntries[0]?.department?.trim() || !fd.roleEntries[0]?.designation?.trim())
    e.push("At least one Department and Designation is required (Step 2)");
  if (!fd.joiningDate)           e.push("Joining Date is required (Step 2)");
  if (fd.createAccount) {
    if (!fd.accountEmail.trim())  e.push("Login Email is required for system access (Step 8)");
    if (!fd.tempPassword)         e.push("Temporary Password is required (Step 8)");
    if (fd.tempPassword && fd.tempPassword.length < 8)
      e.push("Password must be at least 8 characters (Step 8)");
  }
  return e;
}

// ─── Wizard Component ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddEmployeeWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep]         = useState(0);
  const [maxReached, setMax]    = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM);
  const [fileData, setFilesState] = useState<Record<string, File>>({});
  const [submitState, setSubmit]  = useState<SubmitState>({ status: "idle", message: "" });
  const [draftOffered, setDraftOffered] = useState(false);

  // Auto-save to localStorage (debounced, skip photo blob URLs)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { photoPreviewUrl, ...rest } = formData;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    }, 800);
    return () => clearTimeout(t);
  }, [formData, open]);

  // Offer resume on open
  useEffect(() => {
    if (!open || draftOffered) return;
    setDraftOffered(true);
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<WizardFormData>;
      if (parsed.name || parsed.joiningDate) {
        toast("Resume draft?", {
          description: `Continue adding "${parsed.name || "employee"}"`,
          action: {
            label: "Resume",
            onClick: () =>
              setFormData(prev => ({ ...prev, ...parsed, photoPreviewUrl: "" })),
          },
          duration: 6000,
        });
      }
    } catch { /* bad JSON */ }
  }, [open, draftOffered]);

  const handleChange = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      if ("baseSalary" in updates) {
        next.salaryComponents = next.salaryComponents.map(c =>
          c.id === "e1" ? { ...c, amount: updates.baseSalary ?? "" } : c
        );
      }
      return next;
    });
  }, []);

  const setFileData = useCallback((key: string, file: File | null) => {
    setFilesState(prev => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }, []);

  function saveDraft() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { photoPreviewUrl, ...rest } = formData;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    toast.success("Draft saved");
  }

  function handleClose() {
    setStep(0); setMax(0);
    setFormData(INITIAL_FORM);
    setFilesState({});
    setSubmit({ status: "idle", message: "" });
    setDraftOffered(false);
    onClose();
  }

  function goToStep(s: number) {
    if (s <= maxReached) setStep(s);
  }

  function nextStep() {
    if (step < 8) {
      const n = step + 1;
      setStep(n);
      setMax(prev => Math.max(prev, n));
    }
  }

  async function handleSubmit() {
    const errors = getValidationErrors(formData);
    if (errors.length > 0) { toast.error(errors[0]); return; }

    setSubmit({ status: "creating", message: "Creating employee…" });
    try {
      const primaryRole = formData.roleEntries[0] ?? {};
      const derivedSkillTags = formData.skillEntries.map(s => s.skill).filter(Boolean);
      const primaryEdu = formData.educationEntries[0] ?? {};

      const body: Record<string, unknown> = {
        name:    formData.name,
        email:   formData.createAccount ? formData.accountEmail : formData.personalEmail,
        password: formData.createAccount ? formData.tempPassword : undefined,
        role:    formData.createAccount ? formData.role : "EMPLOYEE",
        personalEmail:          formData.personalEmail || null,
        phone:                  formData.phone || null,
        whatsappNumber:         formData.whatsappNumber || null,
        dateOfBirth:            formData.dateOfBirth || null,
        gender:                 formData.gender || null,
        educationQualification: primaryEdu.qualification || null,
        schoolCollege:          primaryEdu.schoolCollege || null,
        maritalStatus:          formData.maritalStatus || null,
        nationality:            formData.nationality || null,
        bloodGroup:             formData.bloodGroup || null,
        employeeType:           formData.employeeType || "full_time",
        address: (formData.city || formData.street || formData.flatDoor) ? {
          flatDoor: formData.flatDoor || null,
          street:   formData.street   || null,
          city:     formData.city     || null,
          pinCode:  formData.pinCode  || null,
          state:    formData.state    || null,
          country:  formData.country  || "India",
        } : null,
        permanentAddress: (formData.permCity || formData.permStreet || formData.permFlatDoor) ? {
          flatDoor: formData.permFlatDoor || null,
          street:   formData.permStreet   || null,
          city:     formData.permCity     || null,
          pinCode:  formData.permPinCode  || null,
          state:    formData.permState    || null,
          country:  formData.permCountry  || "India",
        } : null,
        department:            primaryRole.department || null,
        designation:           primaryRole.designation || null,
        joiningDate:           formData.joiningDate,
        probationEndDate:      formData.probationEndDate || null,
        confirmationDate:      formData.confirmationDate || null,
        shiftStart:            formData.shiftStart || "09:00",
        shiftEnd:              formData.shiftEnd || "18:00",
        workMode:              formData.workMode || "office",
        workLocation:          formData.workLocation || null,
        reportingManagerId:    formData.reportingManagerId ? Number(formData.reportingManagerId) : null,
        contractEndDate:       formData.contractEndDate || null,
        contractRenewalReminder: Number(formData.contractRenewalReminder) || 30,
        ctc:                   formData.ctc ? Number(formData.ctc) : null,
        skillTags:             derivedSkillTags.length > 0 ? derivedSkillTags : null,
        baseSalary:            Number(formData.baseSalary) || 0,
        bankDetails: (formData.bankName || formData.accountNumber) ? {
          bankName:          formData.bankName || null,
          accountNumber:     formData.accountNumber || null,
          accountHolderName: formData.accountHolderName || null,
          ifscCode:          formData.ifscCode || null,
          panNumber:         formData.panNumber || null,
          aadhaarNumber:     formData.aadhaarNumber || null,
          uanNumber:         formData.uanNumber || null,
          esicNumber:        formData.esicNumber || null,
        } : null,
        emergencyContacts: formData.emergencyContacts.filter(c => c.name && c.phone),
      };

      const res = await api.post<ApiResponse<{ uuid: string }>>("/employees", body);
      const uuid = res.data.data.uuid;

      // Upload profile photo
      if (fileData["photo"]) {
        try {
          const photoFd = new FormData();
          photoFd.append("photo", fileData["photo"]);
          await api.post(`/employees/${uuid}/photo`, photoFd);
        } catch { /* non-critical */ }
      }

      // Patch salary if user customized beyond defaults
      const enabledComponents = formData.salaryComponents.filter(c => c.enabled);
      if (enabledComponents.some(c => c.amount !== "")) {
        try {
          await api.patch(`/employees/${uuid}/salary`, {
            components: enabledComponents.map((c, i) => ({
              componentType: c.componentType,
              name: c.name,
              amount: Number(c.amount) || 0,
              isMandatory: c.isMandatory,
              isCustom: c.isCustom,
              sortOrder: c.sortOrder || i + 1,
            })),
          });
        } catch { /* non-critical */ }
      }

      // Upload documents
      const docKeys = Object.keys(fileData).filter(k => k.startsWith("doc:"));
      if (docKeys.length > 0) {
        setSubmit({ status: "uploading-docs", message: `Uploading documents (0/${docKeys.length})…` });
        let n = 0;
        for (const key of docKeys) {
          const file = fileData[key];
          const slotName = key.slice(4);
          const slot = formData.docSlots.find(d => d.slot === slotName);
          if (!slot || !file) continue;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("name", slotName);
          fd.append("docType", slot.docType);
          fd.append("docCategory", slot.category);
          fd.append("isMandatory", slot.isMandatory ? "true" : "false");
          try { await api.post(`/employees/${uuid}/documents`, fd); } catch { /* non-critical */ }
          n++;
          setSubmit({ status: "uploading-docs", message: `Uploading documents (${n}/${docKeys.length})…` });
        }
      }

      // Upload agreements
      const agKeys = Object.keys(fileData).filter(k => k.startsWith("agreement:"));
      if (agKeys.length > 0) {
        setSubmit({ status: "uploading-agreements", message: `Uploading agreements (0/${agKeys.length})…` });
        let n = 0;
        for (const key of agKeys) {
          const file = fileData[key];
          const type = key.slice(10);
          const slot = formData.agreementSlots.find(a => a.agreementType === type);
          if (!slot || !file) continue;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("agreementType", slot.agreementType);
          fd.append("name", slot.name);
          try { await api.post(`/employees/${uuid}/agreements`, fd); } catch { /* non-critical */ }
          n++;
          setSubmit({ status: "uploading-agreements", message: `Uploading agreements (${n}/${agKeys.length})…` });
        }
      }

      setSubmit({ status: "done", message: "Employee created!" });
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Employee created successfully!");
      onCreated();
      setTimeout(handleClose, 900);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create employee";
      setSubmit({ status: "error", message: msg });
      toast.error(msg);
    }
  }

  const stepProps: StepProps = {
    formData, onChange: handleChange,
    fileData, setFileData,
    onGoToStep: goToStep,
    onSubmit: handleSubmit,
    submitState,
    validationErrors: getValidationErrors(formData),
  };

  const STEPS = [
    <Step1PersonalDetails    key={0} {...stepProps} />,
    <Step2JobInformation     key={1} {...stepProps} />,
    <Step3SalaryStructure    key={2} {...stepProps} />,
    <Step4BankTax            key={3} {...stepProps} />,
    <Step5EmergencyContacts  key={4} {...stepProps} />,
    <Step6Documents          key={5} {...stepProps} />,
    <Step7Agreements         key={6} {...stepProps} />,
    <Step8SystemAccess       key={7} {...stepProps} />,
    <Step9ReviewSubmit       key={8} {...stepProps} />,
  ];

  const busy = submitState.status === "creating" || submitState.status === "uploading-docs" || submitState.status === "uploading-agreements";

  const SHORT_LABELS = [
    "Personal", "Job", "Salary", "Bank & Tax",
    "Emergency", "Documents", "Agreements", "Access", "Review",
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent
        className="w-[92vw] max-w-[1100px] sm:max-w-[1100px] md:max-w-[1100px] p-0 gap-0 overflow-hidden flex flex-col border-0 shadow-2xl [&_[data-slot=dialog-close]]:text-white/70 [&_[data-slot=dialog-close]]:hover:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
        style={{ height: "min(90vh, 880px)", borderRadius: "1rem" }}
      >

        {/* ── Dark Green Header ── */}
        <div className="shrink-0" style={{ background: "#1b3a2e" }}>
          {/* Title area */}
          <div className="px-8 pt-7 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
              Employee Setup
            </p>
            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
              Add New Employee
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              Fill in each section to onboard a new team member. You can save a draft at any time.
            </p>
          </div>

          {/* Divider */}
          <div className="mx-8" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

          {/* Step tabs */}
          <div className="flex items-center overflow-x-auto no-scrollbar px-6 pt-3 pb-0 gap-1">
            {STEP_LABELS.map((_label, i) => {
              const isDone      = i < step;
              const isActive    = i === step;
              const isClickable = i <= maxReached;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => isClickable && goToStep(i)}
                  disabled={!isClickable}
                  className="relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap shrink-0 rounded-t-lg transition-all focus:outline-none"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    color: isActive
                      ? "white"
                      : isDone
                      ? "rgba(180,220,195,0.9)"
                      : isClickable
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(255,255,255,0.2)",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  <span
                    className="w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: isActive
                        ? "white"
                        : isDone
                        ? "#5bc98a"
                        : "rgba(255,255,255,0.12)",
                      color: isActive
                        ? "#1b3a2e"
                        : isDone
                        ? "white"
                        : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  {SHORT_LABELS[i]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 min-h-0"
          style={{ background: "#f5f2ed" }}
        >
          {STEPS[step]}
        </div>

        {/* ── Footer ── */}
        <div
          className="shrink-0 px-6 py-4 flex items-center justify-between"
          style={{ background: "#f5f2ed", borderTop: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="h-9 px-4 text-sm font-medium rounded-full transition-all focus:outline-none disabled:opacity-30"
              style={{ background: "rgba(0,0,0,0.06)", color: "#2d4a3e" }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="h-9 px-4 text-sm font-medium rounded-full transition-all focus:outline-none"
              style={{ background: "rgba(0,0,0,0.06)", color: "#2d4a3e" }}
            >
              Save Draft
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: "#6b8070" }}>
              Step {step + 1} of 9
            </span>
            {step < 8 ? (
              <button
                type="button"
                onClick={nextStep}
                className="h-9 px-6 text-sm font-semibold rounded-full transition-all focus:outline-none"
                style={{ background: "#c5d9be", color: "#1b3a2e" }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={busy || submitState.status === "done"}
                className="h-9 px-6 text-sm font-semibold rounded-full transition-all focus:outline-none disabled:opacity-60"
                style={{ background: busy ? "#aac5a3" : "#5bc98a", color: "#0f2018" }}
              >
                {busy ? submitState.message : submitState.status === "done" ? "Done!" : "Create Employee"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
