"use client";

import type { Subscription } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().slice(0, 80);
}

function fmtPrice(price: number | null, currency: string): string {
  if (price == null) return "—";
  const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  return `${sym[currency] ?? currency} ${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// ─── Urgency helper ───────────────────────────────────────────────────────────

type Urgency = "ok" | "soon" | "urgent" | "critical" | "expired";

function getUrgency(daysLeft: number): Urgency {
  if (daysLeft < 0)  return "expired";
  if (daysLeft <= 1) return "critical";
  if (daysLeft <= 7) return "urgent";
  if (daysLeft <= 30) return "soon";
  return "ok";
}

const URGENCY_LEFT_BORDER: Record<Urgency, string> = {
  ok:       "transparent",
  soon:     "#F59E0B",
  urgent:   "#F97316",
  critical: "#EF4444",
  expired:  "#EF4444",
};

const URGENCY_BG: Record<Urgency, string> = {
  ok:       "transparent",
  soon:     "transparent",
  urgent:   "transparent",
  critical: "transparent",
  expired:  "rgba(239,68,68,0.06)",
};

function DaysLeftBadge({ daysLeft }: { daysLeft: number }) {
  const urgency = getUrgency(daysLeft);

  if (urgency === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
        Expired {Math.abs(daysLeft)}d ago
      </span>
    );
  }
  if (urgency === "critical") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
        {daysLeft === 0 ? "Today!" : "1 day left!"}
      </span>
    );
  }
  if (urgency === "urgent") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "rgba(249,115,22,0.12)", color: "#F97316" }}>
        {daysLeft}d left
      </span>
    );
  }
  if (urgency === "soon") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
        {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
      {daysLeft}d left
    </span>
  );
}

// ─── SubscriptionCard ─────────────────────────────────────────────────────────

interface Props {
  sub: Subscription;
  onClick: (sub: Subscription) => void;
}

export function SubscriptionCard({ sub, onClick }: Props) {
  const urgency    = getUrgency(sub.daysLeft);
  const initials   = sub.name.trim()[0]?.toUpperCase() ?? "?";
  const dotColor   = sub.status?.color ?? "#6B7280";
  const remarks    = stripHtml(sub.remarks);

  return (
    <div
      onClick={() => onClick(sub)}
      className="relative flex flex-col gap-3 rounded-xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background:   urgency === "expired" ? URGENCY_BG["expired"] : "var(--bg-surface)",
        border:       "1px solid var(--border)",
        borderLeft:   `3px solid ${URGENCY_LEFT_BORDER[urgency]}`,
        boxShadow:    "0 1px 3px rgba(0,0,0,0.06)",
        backgroundColor: urgency === "expired" ? "rgba(239,68,68,0.04)" : undefined,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
        el.style.transform  = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        el.style.transform  = "translateY(0)";
      }}
    >
      {/* ── Top row: avatar + days left ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {sub.logoUrl ? (
            <img
              src={sub.logoUrl}
              alt={sub.name}
              className="h-10 w-10 rounded-full object-cover shrink-0"
              style={{ border: "1px solid var(--border)" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: sub.category?.color ?? "#6366F1" }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: "var(--text-primary)" }}>
              {sub.name}
            </p>
            {sub.category && (
              <p className="text-xs truncate leading-tight" style={{ color: "var(--text-secondary)" }}>
                {sub.category.label}
              </p>
            )}
          </div>
        </div>
        <DaysLeftBadge daysLeft={sub.daysLeft} />
      </div>

      {/* ── Price ── */}
      <div>
        <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {fmtPrice(sub.price, sub.currency)}
        </span>
        {sub.billingCycle && (
          <span className="ml-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            / {sub.billingCycle.label}
          </span>
        )}
      </div>

      {/* ── Badge row ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sub.status && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: `${sub.status.color}18`, color: sub.status.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: sub.status.color }} />
            {sub.status.label}
          </span>
        )}
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={
            sub.autopay
              ? { background: "rgba(34,197,94,0.12)", color: "#22C55E" }
              : { background: "var(--bg-elevated)",   color: "var(--text-secondary)" }
          }
        >
          {sub.autopay ? "Autopay ON" : "Manual"}
        </span>
      </div>

      {/* ── Remarks excerpt ── */}
      {remarks && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
          {remarks}{sub.remarks && sub.remarks.replace(/<[^>]*>/g, "").length > 80 ? "…" : ""}
        </p>
      )}

      {/* ── Footer: expiry date ── */}
      <p className="text-xs mt-auto pt-1" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
        Expires {new Date(sub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {/* Subtle urgency dot indicator (top-right corner) */}
      {(urgency === "critical" || urgency === "expired") && (
        <span
          className="absolute top-3 right-3 h-2 w-2 rounded-full"
          style={{ background: dotColor }}
        />
      )}
    </div>
  );
}
