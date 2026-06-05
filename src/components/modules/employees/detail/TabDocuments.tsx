"use client";

import { useState } from "react";
import { FileCheck, FolderOpen, ChevronDown, ChevronUp, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";
import { resolveAssetUrl } from "@/lib/utils";

const MANDATORY_SLOTS = [
  "Aadhaar Card",
  "PAN Card",
  "Bank Passbook / Cancelled Cheque",
  "Highest Education Certificate",
  "Resume",
];

// maxDocs > 1 means multiple files can be collected for the same slot
const OPTIONAL_SLOTS: { label: string; maxDocs: number }[] = [
  { label: "Passport",              maxDocs: 1 },
  { label: "Experience Certificate", maxDocs: 1 },
  { label: "Last 3 Payslips",        maxDocs: 3 },
  { label: "Relieving Letter",       maxDocs: 1 },
  { label: "Skill Certificates",     maxDocs: 1 },
];

const VERIFICATION_STYLES: Record<string, string> = {
  pending:  "bg-slate-100 text-slate-600 border border-slate-200",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-600 border border-red-200",
};

export function TabDocuments({ employee, uuid, canEdit }: DetailTabProps) {
  const router = useRouter();
  const [optOpen, setOptOpen] = useState(true); // open by default so admin can see them

  const docs = employee.documents ?? [];

  function findDoc(slotName: string) {
    return docs.find(d => d.name?.toLowerCase() === slotName.toLowerCase());
  }

  function findAllDocs(slotName: string) {
    return docs.filter(d => d.name?.toLowerCase() === slotName.toLowerCase());
  }

  const mandatoryUploaded = MANDATORY_SLOTS.filter(s => findDoc(s)).length;
  const optUploaded       = OPTIONAL_SLOTS.filter(s => findDoc(s.label)).length;

  const knownSlotNames = new Set([...MANDATORY_SLOTS, ...OPTIONAL_SLOTS.map(s => s.label)].map(s => s.toLowerCase()));
  const extraDocs      = docs.filter(d => !d.isMandatory && !knownSlotNames.has(d.name?.toLowerCase() ?? ""));

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

      {/* ── Mandatory ── */}
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
            const doc    = findDoc(slot);
            const status = doc?.verificationStatus ?? null;
            const url    = doc?.filePath ? (resolveAssetUrl(doc.filePath) ?? doc.filePath) : null;
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
                {url && (
                  <a href={url} target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:text-primary/70 font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors shrink-0">
                    View
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Optional — collapsible ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
          onClick={() => setOptOpen(v => !v)}
        >
          <span className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-foreground">Optional Documents</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Passport, experience certificates, payslips, etc.</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
            optUploaded > 0 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}>{optUploaded} / {OPTIONAL_SLOTS.length}</span>
          {optOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {optOpen && (
          <div className="px-5 border-t border-border">
            {[...OPTIONAL_SLOTS, ...extraDocs.map(d => ({ label: d.name ?? "", maxDocs: 1 }))].map(slot => {
              const slotDocs = findAllDocs(slot.label);
              const doc      = slotDocs[0];
              const status   = doc?.verificationStatus ?? null;
              return (
                <div key={slot.label} className="py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${slotDocs.length > 0 ? "text-emerald-500" : "text-muted-foreground/25"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{slot.label}</p>
                        {slot.maxDocs > 1 && slotDocs.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                            {slotDocs.length}/{slot.maxDocs} collected
                          </span>
                        )}
                      </div>
                      {doc ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Uploaded {fmt(doc.createdAt)}
                        </p>
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
                      <a href={resolveAssetUrl(doc.filePath) ?? doc.filePath} target="_blank" rel="noreferrer"
                        className="text-xs text-primary hover:text-primary/70 font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted/40 transition-colors shrink-0">
                        View
                      </a>
                    )}
                  </div>

                  {/* Additional docs for multi-upload slots (e.g. payslip 2, 3) */}
                  {slotDocs.length > 1 && slotDocs.slice(1).map((xd, i) => {
                    const xUrl    = xd.filePath ? (resolveAssetUrl(xd.filePath) ?? xd.filePath) : null;
                    const xStatus = xd.verificationStatus ?? null;
                    return (
                      <div key={xd.id} className="ml-8 mt-2 flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground flex-1">
                          Payslip {i + 2} — Uploaded {fmt(xd.createdAt)}
                        </p>
                        {xStatus && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${VERIFICATION_STYLES[xStatus]}`}>
                            {xStatus}
                          </span>
                        )}
                        {xUrl && (
                          <a href={xUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-primary font-medium px-2 py-0.5 rounded-md border border-border hover:bg-muted/40 transition-colors shrink-0">
                            View
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
