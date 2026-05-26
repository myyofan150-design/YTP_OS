"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, AlertTriangle, CalendarDays } from "lucide-react";
import { useSubscriptionAnalytics } from "@/hooks/useSubscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import type { ApiResponse, Subscription } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// ─── Mini widget (matches existing StatCard aesthetic) ────────────────────────

interface WidgetProps {
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href: string;
}

function MiniWidget({ icon, iconBg, accentColor, title, value, sub, href }: WidgetProps) {
  return (
    <Link href={href} className="block group">
      <div className="card-hover animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all">
        {/* Accent top stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 70%)` }}
        />
        {/* Hover corner glow */}
        <div
          className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{ background: accentColor }}
        />
        <div className="flex items-start gap-4 relative">
          <div className="shrink-0 rounded-xl p-2.5" style={{ background: iconBg }}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <div className="text-xl font-bold tracking-tight mt-0.5">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── SubscriptionDashboardWidgets ─────────────────────────────────────────────

export function SubscriptionDashboardWidgets() {
  const { analytics, loading: analyticsLoading } = useSubscriptionAnalytics();
  const [nextSub,     setNextSub]     = useState<Subscription | null>(null);
  const [subsLoading, setSubsLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<{ subscriptions: Subscription[] }>>("/subscriptions", { params: { limit: 5 } })
      .then(r => {
        const subs: Subscription[] = r.data.data.subscriptions ?? [];
        setNextSub(subs.find(s => s.daysLeft > 0) ?? null);
      })
      .catch(() => {})
      .finally(() => setSubsLoading(false));
  }, []);

  const loading = analyticsLoading || subsLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const expiring = analytics?.expiringIn30Days ?? 0;

  const nextSubPrice = nextSub?.price != null
    ? `${nextSub.currency === "INR" ? "₹" : nextSub.currency}${nextSub.price.toLocaleString("en-IN")}`
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Widget 1: Monthly Spend */}
      <MiniWidget
        href="/subscriptions"
        icon={<CreditCard className="h-4 w-4" style={{ color: "#6366F1" }} />}
        iconBg="rgba(99,102,241,.12)"
        accentColor="#6366F1"
        title="Monthly Spend"
        value={fmtPrice(analytics?.totalMonthlySpend ?? 0)}
        sub={`across ${analytics?.totalActive ?? 0} active subscription${(analytics?.totalActive ?? 0) !== 1 ? "s" : ""}`}
      />

      {/* Widget 2: Expiring Soon */}
      <MiniWidget
        href="/subscriptions"
        icon={<AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />}
        iconBg={expiring > 0 ? "rgba(245,158,11,.15)" : "rgba(245,158,11,.08)"}
        accentColor="#F59E0B"
        title="Expiring Soon"
        value={
          <span style={{ color: expiring > 0 ? "#F59E0B" : "inherit" }}>
            {expiring} subscription{expiring !== 1 ? "s" : ""}
          </span>
        }
        sub="within next 30 days"
      />

      {/* Widget 3: Next Renewal */}
      <MiniWidget
        href="/subscriptions"
        icon={<CalendarDays className="h-4 w-4" style={{ color: "#3B82F6" }} />}
        iconBg="rgba(59,130,246,.12)"
        accentColor="#3B82F6"
        title="Next Renewal"
        value={nextSub?.name ?? "—"}
        sub={
          nextSub
            ? `in ${nextSub.daysLeft} day${nextSub.daysLeft !== 1 ? "s" : ""}${nextSubPrice ? ` — ${nextSubPrice}` : ""}`
            : "No upcoming renewals"
        }
      />
    </div>
  );
}
