"use client";

import { useMemo } from "react";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
function toFullUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${BACKEND}/${url}`;
}
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import { useSubscriptionAnalytics } from "@/hooks/useSubscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Subscription } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, urgent,
}: { label: string; value: string; sub?: string; urgent?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: urgent ? "#EF4444" : "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: urgent ? "#EF4444" : "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

// ─── SubscriptionAnalytics ───────────────────────────────────────────────────

interface Props {
  subs: Subscription[];
}

export function SubscriptionAnalytics({ subs }: Props) {
  const { analytics, loading } = useSubscriptionAnalytics();

  const top5 = useMemo(
    () => [...subs].filter(s => s.price != null).sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 5),
    [subs]
  );

  const pieData = useMemo(
    () => (analytics?.byCategory ?? [])
      .filter(c => c.total > 0)
      .map(c => ({ name: c.categoryName ?? "Uncategorized", value: c.total, color: c.color ?? "#6B7280" })),
    [analytics]
  );

  const barData = useMemo(
    () => (analytics?.byBillingCycle ?? [])
      .filter(b => b.total > 0)
      .map(b => ({ name: b.label ?? "Unset", value: b.total, color: b.color ?? "#6B7280" })),
    [analytics]
  );

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Row 1: Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Monthly Spend"
          value={fmt(analytics.totalMonthlySpend)}
          sub="active monthly subs"
        />
        <StatCard
          label="Annual Spend"
          value={fmt(analytics.totalAnnualSpend)}
          sub="normalized to year"
        />
        <StatCard
          label="Expiring in 7 days"
          value={String(analytics.expiringIn7Days)}
          urgent={analytics.expiringIn7Days > 0}
          sub={analytics.expiringIn7Days > 0 ? "needs attention" : "all clear"}
        />
        <StatCard
          label="Active Subscriptions"
          value={String(analytics.totalActive)}
          sub="currently active"
        />
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Donut: spend by category */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Spend by Category</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No category data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="44%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [fmt(Number(value)), "Spend"]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => (
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: spend by billing cycle */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Spend by Billing Cycle</p>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No billing data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`}
                />
                <Tooltip
                  formatter={(value: unknown) => [fmt(Number(value)), "Spend"]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Top 5 most expensive ── */}
      {top5.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Top 5 Most Expensive</p>
          <ul className="space-y-2.5">
            {top5.map((sub, i) => (
              <li key={sub.uuid} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                  {i + 1}
                </span>
                {sub.logoUrl ? (
                  <img
                    src={toFullUrl(sub.logoUrl)!}
                    alt={sub.name}
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                    style={{ border: "1px solid var(--border)" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: sub.category?.color ?? "#6366F1" }}
                  >
                    {sub.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {sub.name}
                </span>
                {sub.billingCycle && (
                  <span
                    className="shrink-0 text-xs rounded-full px-2 py-0.5 font-medium"
                    style={{ background: `${sub.billingCycle.color}18`, color: sub.billingCycle.color }}
                  >
                    {sub.billingCycle.label}
                  </span>
                )}
                <span className="shrink-0 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {sub.currency === "INR" ? "₹" : sub.currency}
                  {sub.price?.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
