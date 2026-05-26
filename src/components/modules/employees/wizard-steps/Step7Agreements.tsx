"use client";

import { useRef } from "react";
import { CheckCircle2, Upload, FileSignature, AlertCircle } from "lucide-react";
import type { StepProps, AgreementSlotForm } from "../AddEmployeeWizard";

const ALLOWED = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_MB  = 10;

function AgreementRow({
  slot, fileKey, fileData, setFileData, onNameUpdate,
}: {
  slot: AgreementSlotForm;
  fileKey: string;
  fileData: Record<string, File>;
  setFileData: (key: string, file: File | null) => void;
  onNameUpdate: (fileName: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const file     = fileData[fileKey];
  const uploaded = !!file;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Max ${MAX_MB}MB allowed.`);
      return;
    }
    setFileData(fileKey, f);
    onNameUpdate(f.name);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <CheckCircle2 className={`w-4 h-4 shrink-0 transition-colors ${uploaded ? "text-emerald-500" : "text-muted-foreground/25"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{slot.name}</p>
        {file ? (
          <p className="text-[11px] text-emerald-600 truncate mt-0.5">{file.name}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOCX, JPG, PNG — max {MAX_MB}MB</p>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ALLOWED} className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
          uploaded
            ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40"
        }`}
      >
        <Upload className="w-3 h-3" />
        {uploaded ? "Change" : "Upload"}
      </button>
    </div>
  );
}

export function Step7Agreements({ formData, onChange, fileData, setFileData }: StepProps) {
  function updateSlotFileName(idx: number, fileName: string | null) {
    const updated = formData.agreementSlots.map((s, i) => i === idx ? { ...s, fileName } : s);
    onChange({ agreementSlots: updated });
  }

  const uploadedCount = formData.agreementSlots.filter(s => fileData[`agreement:${s.agreementType}`]).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileSignature className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Signed Agreements</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">All are optional at this stage</p>
          </div>
          {uploadedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {uploadedCount} uploaded
            </span>
          )}
        </div>
        <div className="px-5">
          {formData.agreementSlots.map((slot, idx) => (
            <AgreementRow
              key={slot.agreementType}
              slot={slot}
              fileKey={`agreement:${slot.agreementType}`}
              fileData={fileData}
              setFileData={setFileData}
              onNameUpdate={name => updateSlotFileName(idx, name)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border px-4 py-3">
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Agreements can be uploaded later from the employee&apos;s profile page. All uploaded files are stored securely.
        </p>
      </div>
    </div>
  );
}
