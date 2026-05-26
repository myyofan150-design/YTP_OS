"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserPlus, FileWarning, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import type { ApiResponse } from "@/types";

interface EmpStats {
  total: number;
  active: number;
  onProbation: number;
  onNoticePeriod: number;
  missingMandatoryDocs: number;
  birthdaysThisMonth: Array<{ name: string; photoUrl?: string | null; dateOfBirth: string }>;
  recentJoins: Array<{ name: string; photoUrl?: string | null; designation?: string | null; joiningDate: string }>;
}

function Avatar({ name, url, size = 7 }: { name: string; url?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const sz = `w-${size} h-${size}`;
  const src = resolveAssetUrl(url);
  if (src && !imgErr) return (
    <img src={src} alt={name} onError={() => setImgErr(true)}
      className={`${sz} rounded-full object-cover shrink-0`} />
  );
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function MiniStatCard({
  label, value, sub, icon, accent, iconBg, href,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; accent: string; iconBg: string; href?: string;
}) {
  const inner = (
    <div className="card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }} />
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2 shrink-0" style={{ background: iconBg }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function daysSince(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function birthdayLabel(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  return dob.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function joiningThisMonth(recentJoins: EmpStats["recentJoins"]): number {
  const now = new Date();
  return recentJoins.filter(r => {
    const d = new Date(r.joiningDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

export function EmployeeDashboardWidgets() {
  const [stats, setStats] = useState<EmpStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<EmpStats>>("/employees/stats")
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading employee data…
      </div>
    );
  }

  if (!stats) return null;

  const joiningThisMonthCount = joiningThisMonth(stats.recentJoins);

  return (
    <div className="space-y-4">
      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MiniStatCard
          label="Active Employees"
          value={stats.active}
          sub={`${stats.total} total`}
          icon={<Users className="w-4 h-4" style={{ color: "#22c55e" }} />}
          accent="#22c55e"
          iconBg="rgba(34,197,94,.12)"
          href="/employees?status=ACTIVE"
        />
        <MiniStatCard
          label="Joining This Month"
          value={joiningThisMonthCount}
          sub="new hires"
          icon={<UserPlus className="w-4 h-4" style={{ color: "#3b82f6" }} />}
          accent="#3b82f6"
          iconBg="rgba(59,130,246,.12)"
          href="/employees"
        />
        <MiniStatCard
          label="Missing Documents"
          value={stats.missingMandatoryDocs}
          sub="employees affected"
          icon={<FileWarning className="w-4 h-4" style={{ color: "#ef4444" }} />}
          accent="#ef4444"
          iconBg="rgba(239,68,68,.12)"
          href="/employees"
        />
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Birthdays this month */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Birthdays This Month</p>
            <span className="text-xs text-muted-foreground">{stats.birthdaysThisMonth.length}</span>
          </div>
          <div className="divide-y divide-border/50">
            {stats.birthdaysThisMonth.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No birthdays this month</p>
            ) : (
              stats.birthdaysThisMonth.slice(0, 6).map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={b.name} url={b.photoUrl} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{b.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    {birthdayLabel(b.dateOfBirth)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent joins */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Recent Joins</p>
            <Link href="/employees" className="text-[10px] text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border/50">
            {stats.recentJoins.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No recent joins</p>
            ) : (
              stats.recentJoins.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={r.name} url={r.photoUrl} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                    {r.designation && <p className="text-[10px] text-muted-foreground truncate">{r.designation}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{daysSince(r.joiningDate)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
