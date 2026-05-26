"use client";

import { useState } from "react";
import { FileCheck, FolderOpen, ChevronDown, ChevronUp, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

const MANDATORY_SLOTS = [
  "Aadhaar Card",
  "PAN Card",
  "Bank Passbook / Cancelled Cheque",
  "Highest Education Certificate",
];

const OPTIONAL_SLOTS = [
  "Passport",
  "Experience Certificate",
  "Last 3 Payslips",
  "Relieving Letter",
  "Skill Certificates",
];

const VERIFICATION_STYLES: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-600 border border-slate-200",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-600 border border-red-200",
};

const apiBase = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

export function TabDocuments({ employee, uuid, canEdit }: DetailTabProps) {
  const router = useRouter();
  const [optOpen, setOptOpen] = useState(false);

  const docs = employee.documents ?? [];

  // Match uploaded docs to named slots by name (wizard uploads use slot name as doc name)
  function findDoc(slotName: string) {
    return docs.find(d => d.name?.toLowerCase() === slotName.toLowerCase());
  }

  const mandatoryUploaded = MANDATORY_SLOTS.filter(s => findDoc(s)).length;

  // Optional: known-slot docs + any non-mandatory docs not in a known slot
  const knownSlotNames = new Set([...MANDATORY_SLOTS, ...OPTIONAL_SLOTS].map(s => s.toLowerCase()));
  const extraDocs = docs.filter(d => !d.isMandatory && !knownSlotNames.has(d.name?.toLowerCase() ?? ""));

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=6`)}>
            <Pencil className="w-3 h-3" /> Edit Documents
          </Button>
        </div>
      )}

      {/* Mandatory */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileCheck className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Mandatory Documents</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Required for compliance and onboarding</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            mandatoryUploaded >= MANDATORY_SLOTS.length
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}>{mandatoryUploaded} / {MANDATORY_SLOTS.length}</span>
        </div>
        <div className="px-5">
          {MANDATORY_SLOTS.map(slot => {
            const doc = findDoc(slot);
            const status = doc?.verificationStatus ?? null;
            return (
              <div key={slot} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${doc ? "text-emerald-500" : "text-muted-foreground/25"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{slot}</p>
                  {doc ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Uploaded {fmt(doc.createdAt)}
                      {doc.expiryDate ? ` · Expires ${fmt(doc.expiryDate)}` : ""}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 mt-0.5">Not uploaded</p>
                  )}
                </div>
                {status && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${VERIFICATION_STYLES[status]}`}>
                    {status}
                  </span>
                )}
                {doc?.filePath && (
                  <a href={`${apiBase}/${doc.filePath}`} target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:text-primary/70 font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors shrink-0">
                    View
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional — collapsible */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
          onClick={() => setOptOpen(v => !v)}
        >
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-foreground">Optional Documents</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Passport, experience certificates, etc.</p>
          </div>
          {optOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {optOpen && (
          <div className="px-5 border-t border-border">
            {[...OPTIONAL_SLOTS, ...extraDocs.map(d => d.name)].map(slot => {
              const doc = typeof slot === "string" ? (findDoc(slot) ?? extraDocs.find(d => d.name === slot)) : null;
              const slotName = typeof slot === "string" ? slot : (slot as { name: string }).name;
              const status = doc?.verificationStatus ?? null;
              return (
                <div key={slotName} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${doc ? "text-emerald-500" : "text-muted-foreground/25"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{slotName}</p>
                    {doc ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Uploaded {fmt(doc.createdAt)}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Not uploaded</p>
                    )}
                  </div>
                  {status && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${VERIFICATION_STYLES[status]}`}>
                      {status}
                    </span>
                  )}
                  {doc?.filePath && (
                    <a href={`${apiBase}/${doc.filePath}`} target="_blank" rel="noreferrer"
                      className="text-xs text-primary hover:text-primary/70 font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors shrink-0">
                      View
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
