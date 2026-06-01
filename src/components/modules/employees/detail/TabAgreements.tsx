"use client";

import { FileSignature, CheckCircle2, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DetailTabProps } from "./types";
import { fmt } from "./types";

const AGREEMENT_SLOTS = [
  { agreementType: "offer_letter",         name: "Offer Letter" },
  { agreementType: "appointment_letter",   name: "Appointment Letter" },
  { agreementType: "nda",                  name: "NDA" },
  { agreementType: "employment_agreement", name: "Employment Agreement" },
  { agreementType: "leave_policy",         name: "Leave Policy" },
  { agreementType: "it_policy",            name: "IT Policy" },
  { agreementType: "code_of_conduct",      name: "Code of Conduct" },
];

import { resolveAssetUrl } from "@/lib/utils";


export function TabAgreements({ employee, uuid, canEdit }: DetailTabProps) {
  const router = useRouter();
  const agreements = employee.agreements ?? [];

  const uploadedCount = AGREEMENT_SLOTS.filter(s =>
    agreements.some(a => a.agreementType === s.agreementType)
  ).length;

  // Extra agreements uploaded outside the standard slots
  const knownTypes = new Set(AGREEMENT_SLOTS.map(s => s.agreementType));
  const extraAgreements = agreements.filter(a => !knownTypes.has(a.agreementType ?? ""));

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => router.push(`/employees/${uuid}/edit?step=7`)}>
            <Pencil className="w-3 h-3" /> Edit Agreements
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileSignature className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Signed Agreements</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Employment agreements and policy acknowledgements</p>
          </div>
          {uploadedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {uploadedCount} / {AGREEMENT_SLOTS.length}
            </span>
          )}
        </div>
        <div className="px-5">
          {AGREEMENT_SLOTS.map(slot => {
            const ag = agreements.find(a => a.agreementType === slot.agreementType);
            return (
              <div key={slot.agreementType} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${ag ? "text-emerald-500" : "text-muted-foreground/25"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{slot.name}</p>
                  {ag ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {ag.version ?? "v1"} · Uploaded {fmt(ag.createdAt)}
                      {ag.signedAt ? ` · Signed ${fmt(ag.signedAt)}` : ""}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Not uploaded</p>
                  )}
                </div>
                {ag?.filePath && (
                  <a href={resolveAssetUrl(ag.filePath) ?? ag.filePath} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}

          {extraAgreements.map(ag => (
            <div key={ag.id} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ag.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ag.version ?? "v1"} · Uploaded {fmt(ag.createdAt)}
                </p>
              </div>
              {ag.filePath && (
                <a href={resolveAssetUrl(ag.filePath) ?? ag.filePath} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
