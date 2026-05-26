"use client";

import { MessageCircle } from "lucide-react";
import type { Lead } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBudget(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

interface Props {
  lead: Lead;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: Props) {
  const priorityColor = lead.priority?.color ?? "#94A3B8";
  const visibleServices = lead.services.slice(0, 3);
  const extraServices   = lead.services.length - 3;
  const overdue = isOverdue(lead.nextFollowup);

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
    >
      {/* Priority left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: priorityColor }}
      />

      <div className="pl-4 pr-3 pt-3 pb-3 space-y-2.5">

        {/* Row 1: Name + company */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate" style={{ color: "var(--text-primary)" }}>
              {lead.contactPerson}
            </p>
            {lead.companyName && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {lead.companyName}
              </p>
            )}
          </div>
          {lead.whatsapp && (
            <a
              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={`WhatsApp ${lead.whatsapp}`}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}
            >
              <MessageCircle size={12} />
            </a>
          )}
        </div>

        {/* Row 2: Status + Source */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.status && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: `${lead.status.color}18`, color: lead.status.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: lead.status.color }} />
              {lead.status.label}
            </span>
          )}
          {lead.source && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: `${lead.source.color}14`, color: lead.source.color }}
            >
              {lead.source.label}
            </span>
          )}
        </div>

        {/* Row 3: Services */}
        {lead.services.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {visibleServices.map(s => (
              <span
                key={s.uuid}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: `${s.color}14`, color: s.color }}
              >
                {s.label}
              </span>
            ))}
            {extraServices > 0 && (
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                +{extraServices} more
              </span>
            )}
          </div>
        )}

        {/* Row 4: Budget + Timeline */}
        {(lead.budgetMin != null || lead.budgetMax != null || lead.timeline) && (
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            {(lead.budgetMin != null || lead.budgetMax != null) && (
              <span>
                {lead.budgetMin != null ? fmtBudget(lead.budgetMin) : "—"}
                {" – "}
                {lead.budgetMax != null ? fmtBudget(lead.budgetMax) : "—"}
              </span>
            )}
            {lead.timeline && (
              <span>{new Date(lead.timeline + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        )}

        {/* Footer: Assigned + Follow-up */}
        <div className="flex items-center justify-between pt-0.5 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
            {lead.assignedUser?.name ?? "Unassigned"}
          </span>
          {lead.nextFollowup && (
            <span
              className="text-[11px] font-medium shrink-0"
              style={{ color: overdue ? "#EF4444" : "var(--text-secondary)" }}
            >
              {overdue ? "⚠ " : ""}
              {new Date(lead.nextFollowup + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
