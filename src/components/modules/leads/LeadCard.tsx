"use client";

import type { Lead } from "@/types";

// ─── WhatsApp SVG icon ────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBudget(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const s = d.slice(0, 10);
  const dt = new Date(s + "T00:00:00");
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date.slice(0, 10) + "T00:00:00") < new Date(new Date().toDateString());
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

interface Props {
  lead:    Lead;
  onClick: () => void;
  kanban?: boolean; // when true: show services badge row instead of status badge
}

export function LeadCard({ lead, onClick, kanban = false }: Props) {
  const priorityColor    = lead.priority?.color ?? "#94A3B8";
  const visibleServices  = lead.services.slice(0, 3);
  const extraServices    = lead.services.length - 3;
  const overdue          = isOverdue(lead.nextFollowup);
  const formattedDate    = fmtDate(lead.nextFollowup);

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
    >
      {/* Priority left border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: priorityColor }} />

      <div className="pl-4 pr-3 pt-3 pb-3 space-y-2.5">

        {/* Row 1: Name + WhatsApp */}
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
              <WhatsAppIcon size={12} />
            </a>
          )}
        </div>

        {/* Row 2: In kanban — services; in list — status + source */}
        {kanban ? (
          lead.services.length > 0 ? (
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
                  +{extraServices}
                </span>
              )}
            </div>
          ) : null
        ) : (
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
        )}

        {/* Row 3: Services (list view only) */}
        {!kanban && lead.services.length > 0 && (
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

        {/* Budget + Timeline */}
        {(lead.budgetMin != null || lead.budgetMax != null || lead.timeline) && (
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            {(lead.budgetMin != null || lead.budgetMax != null) && (
              <span>
                {lead.budgetMin != null && lead.budgetMax != null
                  ? `${fmtBudget(lead.budgetMin)} – ${fmtBudget(lead.budgetMax)}`
                  : lead.budgetMin != null
                  ? `${fmtBudget(lead.budgetMin)}+`
                  : `Up to ${fmtBudget(lead.budgetMax!)}`
                }
              </span>
            )}
            {lead.timeline && fmtDate(lead.timeline) && (
              <span>{fmtDate(lead.timeline)}</span>
            )}
          </div>
        )}

        {/* Footer: Assigned + Follow-up */}
        <div className="flex items-center justify-between pt-0.5 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
            {lead.assignedUser?.name ?? "Unassigned"}
          </span>
          {formattedDate && (
            <span
              className="text-[11px] font-medium shrink-0"
              style={{ color: overdue ? "#EF4444" : "var(--text-secondary)" }}
            >
              {overdue ? "⚠ " : ""}{formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
