"use client";

// src/app/(dashboard)/employees/[uuid]/page.tsx
// Employee detail: 4 tabs — Profile, Bank & Tax, Leave Balance, Documents

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { EmpStatusBadge } from "@/components/modules/employees/EmpStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmployeeDetail, EmployeeDocument, ApiResponse } from "@/types";

const TABS = ["Profile", "Bank & Tax", "Leave Balance", "Documents"] as const;
type Tab = typeof TABS[number];

const HR_ROLES  = ["SUPER_ADMIN", "ADMIN", "HR"];
const FIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HR", "ACCOUNTANT"];

const DOC_TYPES = ["OFFER_LETTER", "CONTRACT", "ID_PROOF", "APPRAISAL", "OTHER"] as const;
const FILE_ICONS: Record<string, string> = { pdf: "📄", docx: "📝", xlsx: "📊", png: "🖼️", jpg: "🖼️", jpeg: "🖼️" };

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold border-2 border-slate-200">
      {initials}
    </div>
  );
}

function LeaveBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const remaining = Math.max(total - used, 0);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          <span className="font-semibold text-slate-800">{remaining}</span> / {total} remaining
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400">{used} used</p>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { uuid } = useParams() as { uuid: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Profile");

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Document upload
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [showDocForm, setShowDocForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit    = HR_ROLES.includes(user?.role ?? "");
  const canSeeFin  = FIN_ROLES.includes(user?.role ?? "");

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<EmployeeDetail>>(`/employees/${uuid}`);
      setEmployee(res.data.data);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  function startEdit() {
    if (!employee) return;
    setEditForm({
      name:             employee.user.name,
      email:            employee.user.email,
      department:       employee.department       ?? "",
      designation:      employee.designation      ?? "",
      shiftStart:       employee.shiftStart,
      shiftEnd:         employee.shiftEnd,
      baseSalary:       String(employee.baseSalary),
      bankName:         employee.bankName          ?? "",
      bankAccount:      employee.bankAccount       ?? "",
      bankIfsc:         employee.bankIfsc          ?? "",
      panNumber:        employee.panNumber         ?? "",
      emergencyContact: employee.emergencyContact  ?? "",
      emergencyPhone:   employee.emergencyPhone    ?? "",
      status:           employee.status,
    });
    setEditError("");
    setEditMode(true);
  }

  async function saveEdit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const body: Record<string, string | number | null> = {
        name:             editForm["name"]             || null,
        email:            editForm["email"]            || null,
        department:       editForm["department"]       || null,
        designation:      editForm["designation"]      || null,
        shiftStart:       editForm["shiftStart"]       || null,
        shiftEnd:         editForm["shiftEnd"]         || null,
        baseSalary:       editForm["baseSalary"] ? Number(editForm["baseSalary"]) : null,
        bankName:         editForm["bankName"]         || null,
        bankAccount:      editForm["bankAccount"]      || null,
        bankIfsc:         editForm["bankIfsc"]         || null,
        panNumber:        editForm["panNumber"]        || null,
        emergencyContact: editForm["emergencyContact"] || null,
        emergencyPhone:   editForm["emergencyPhone"]   || null,
        status:           editForm["status"]           || null,
      };
      await api.patch(`/employees/${uuid}`, body);
      setEditMode(false);
      fetchEmployee();
    } catch (err: unknown) {
      setEditError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  }

  function setEF(field: string, val: string) {
    setEditForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleDocUpload(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!docFile) return;
    setDocUploading(true);
    setDocError("");
    try {
      const fd = new FormData();
      fd.append("file", docFile);
      if (docName) fd.append("name", docName);
      fd.append("docType", docType);
      await api.post(`/employees/${uuid}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDocFile(null); setDocName(""); setDocType("OTHER"); setShowDocForm(false);
      if (fileRef.current) fileRef.current.value = "";
      fetchEmployee();
    } catch (err: unknown) {
      setDocError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Upload failed"
      );
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete(doc: EmployeeDocument) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    try {
      await api.delete(`/employees/${uuid}/documents/${doc.id}`);
      fetchEmployee();
    } catch { /* ignore */ }
  }

  function formatDate(s?: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  const apiBase = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading…</div>;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-slate-500">Employee not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const lb = employee.leaveBalance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={employee.user.name} url={employee.user.avatarUrl} />
          <div>
            <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 mb-1">← Employees</button>
            <h1 className="text-xl font-bold text-slate-800">{employee.user.name}</h1>
            <p className="text-sm text-slate-500">
              <span className="font-mono text-xs mr-2 bg-slate-100 px-2 py-0.5 rounded">{employee.employeeCode}</span>
              {employee.designation ?? ""}
              {employee.department ? ` · ${employee.department}` : ""}
            </p>
            <div className="mt-1">
              <EmpStatusBadge status={employee.status} />
            </div>
          </div>
        </div>
        {canEdit && !editMode && (
          <Button onClick={startEdit} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white shrink-0">
            Edit Employee
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setEditMode(false); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
              {t === "Documents" && employee.documents.length > 0 && (
                <span className="ml-1.5 text-xs text-slate-400">({employee.documents.length})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Profile ─────────────────────────────────────────── */}
      {tab === "Profile" && !editMode && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email"       value={employee.user.email} />
              <Field label="Status"      value={employee.status.replace("_", " ")} />
              <Field label="Joining Date" value={formatDate(employee.joiningDate)} />
              <Field label="Shift"       value={`${employee.shiftStart} – ${employee.shiftEnd}`} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Job Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department"  value={employee.department} />
              <Field label="Designation" value={employee.designation} />
              <Field label="Base Salary" value={employee.baseSalary != null ? `₹${Number(employee.baseSalary).toLocaleString("en-IN")}` : null} />
              <Field label="Employee Code" value={employee.employeeCode} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Emergency Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name"  value={employee.emergencyContact} />
              <Field label="Contact Phone" value={employee.emergencyPhone} />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Form (Profile tab) ───────────────────────────────── */}
      {tab === "Profile" && editMode && (
        <form onSubmit={saveEdit} className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5 space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-700">Edit Employee</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Full Name</Label>
              <Input value={editForm["name"] ?? ""} onChange={(e) => setEF("name", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Email</Label>
              <Input value={editForm["email"] ?? ""} onChange={(e) => setEF("email", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Department</Label>
              <Input value={editForm["department"] ?? ""} onChange={(e) => setEF("department", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Designation</Label>
              <Input value={editForm["designation"] ?? ""} onChange={(e) => setEF("designation", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Shift Start</Label>
              <Input type="time" value={editForm["shiftStart"] ?? "09:00"} onChange={(e) => setEF("shiftStart", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Shift End</Label>
              <Input type="time" value={editForm["shiftEnd"] ?? "18:00"} onChange={(e) => setEF("shiftEnd", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Base Salary (₹)</Label>
              <Input type="number" value={editForm["baseSalary"] ?? ""} onChange={(e) => setEF("baseSalary", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Status</Label>
              <Select value={editForm["status"] ?? "ACTIVE"} onValueChange={(v) => setEF("status", v ?? "ACTIVE")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE"        className="text-sm">Active</SelectItem>
                  <SelectItem value="INACTIVE"      className="text-sm">Inactive</SelectItem>
                  <SelectItem value="NOTICE_PERIOD" className="text-sm">Notice Period</SelectItem>
                  <SelectItem value="TERMINATED"    className="text-sm">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Emergency Contact</Label>
              <Input value={editForm["emergencyContact"] ?? ""} onChange={(e) => setEF("emergencyContact", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Emergency Phone</Label>
              <Input value={editForm["emergencyPhone"] ?? ""} onChange={(e) => setEF("emergencyPhone", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="h-9 text-sm">Cancel</Button>
          </div>
        </form>
      )}

      {/* ── Tab: Bank & Tax ──────────────────────────────────────── */}
      {tab === "Bank & Tax" && (
        <div className="max-w-lg">
          {!canSeeFin ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-2xl mb-3">🔒</p>
              <p className="text-sm font-semibold text-slate-700">Access Restricted</p>
              <p className="text-xs text-slate-400 mt-1">Bank and tax information is only visible to HR, Admin, and Accountant roles.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Bank & Tax Details</h2>
              {editMode ? (
                <form onSubmit={saveEdit} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Bank Name</Label>
                    <Input value={editForm["bankName"] ?? ""} onChange={(e) => setEF("bankName", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Account Number</Label>
                      <Input value={editForm["bankAccount"] ?? ""} onChange={(e) => setEF("bankAccount", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">IFSC Code</Label>
                      <Input value={editForm["bankIfsc"] ?? ""} onChange={(e) => setEF("bankIfsc", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">PAN Number</Label>
                    <Input value={editForm["panNumber"] ?? ""} onChange={(e) => setEF("panNumber", e.target.value)} className="h-9 text-sm" />
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white">{saving ? "Saving…" : "Save"}</Button>
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="h-9 text-sm">Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bank Name"       value={employee.bankName} />
                  <Field label="IFSC Code"       value={employee.bankIfsc} />
                  <Field label="Account Number"  value={employee.bankAccount ?? "Not provided"} />
                  <Field label="PAN Number"      value={employee.panNumber   ?? "Not provided"} />
                </div>
              )}
              {!editMode && canEdit && (
                <Button variant="outline" size="sm" onClick={startEdit} className="h-8 text-xs mt-2">Edit Bank Details</Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Leave Balance ───────────────────────────────────── */}
      {tab === "Leave Balance" && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Leave Balance — {new Date().getFullYear()}</h2>
            </div>
            {!lb ? (
              <p className="text-sm text-slate-400 text-center py-4">No leave balance found.</p>
            ) : (
              <div className="space-y-5">
                <LeaveBar
                  label="Casual Leave"
                  used={Number(lb.casualUsed)}
                  total={Number(lb.casualTotal)}
                  color="bg-blue-400"
                />
                <LeaveBar
                  label="Sick Leave"
                  used={Number(lb.sickUsed)}
                  total={Number(lb.sickTotal)}
                  color="bg-amber-400"
                />
                <LeaveBar
                  label="Paid Leave"
                  used={Number(lb.paidUsed)}
                  total={Number(lb.paidTotal)}
                  color="bg-emerald-400"
                />
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Comp-Off</span>
                    <span className="font-semibold text-slate-800">{Number(lb.compOff)} days available</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Documents ───────────────────────────────────────── */}
      {tab === "Documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
            {canEdit && !showDocForm && (
              <Button size="sm" onClick={() => setShowDocForm(true)} className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white">
                + Upload Document
              </Button>
            )}
          </div>

          {showDocForm && canEdit && (
            <form onSubmit={handleDocUpload} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3 max-w-lg">
              <p className="text-xs font-semibold text-slate-700">Upload Document</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Display Name</Label>
                  <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Leave blank for filename" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Document Type</Label>
                  <Select value={docType} onValueChange={(v) => setDocType(v ?? "OTHER")}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{t.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">File *</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="text-xs text-slate-600 file:mr-3 file:h-8 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  required
                />
              </div>
              {docError && <p className="text-xs text-red-600">{docError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={docUploading || !docFile} size="sm" className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white">
                  {docUploading ? "Uploading…" : "Upload"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDocForm(false)} className="h-8 text-xs">Cancel</Button>
              </div>
            </form>
          )}

          {employee.documents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2 max-w-xl">
              {employee.documents.map((doc) => {
                const ext = doc.filePath.split(".").pop() ?? "";
                return (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{FILE_ICONS[ext] ?? "📎"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-400">{doc.docType.replace("_", " ")} · {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={`${apiBase}/${doc.filePath}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View</a>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleDocDelete(doc)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs">Delete</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
