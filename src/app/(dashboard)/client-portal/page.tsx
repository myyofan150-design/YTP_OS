"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare, FileText, CalendarClock, Loader2, Building2,
  TrendingUp, AlertTriangle, Clock,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClientInfo {
  companyName: string;
  status: string;
  contractType: string;
  monthlyFee: number | null;
  contractStart: string | null;
  contractEnd: string | null;
}

interface TaskCounts {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  total: number;
}

interface InvoiceTotals {
  paid: number;
  pending: number;
  overdue: number;
  draft: number;
}

interface RecentTask {
  id: number;
  uuid: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  assigneeName: string | null;
}

interface DashData {
  client: ClientInfo | null;
  daysUntilRenewal: number | null;
  tasks: TaskCounts;
  invoices: InvoiceTotals;
  recentTasks: RecentTask[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "#64748b", IN_PROGRESS: "#f59e0b", IN_REVIEW: "#6366f1", DONE: "#22c55e", CANCELLED: "#ef4444",
};
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#6366f1", LOW: "#22c55e",
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent, index = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent: string; index?: number;
}) {
  return (
    <div
      className="group card-hover animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }} />
      <div
        className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-300"
        style={{ background: accent }}
      />
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl p-2.5"
          style={{ background: `${accent}18` }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ClientPortalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/client-portal/dashboard");
      setData(r.data.data);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  const d = data;

  const renewalAlert = d?.daysUntilRenewal !== null && d?.daysUntilRenewal !== undefined
    ? d.daysUntilRenewal <= 0
      ? { label: "Contract expired", color: "#ef4444" }
      : d.daysUntilRenewal <= 14
        ? { label: `${d.daysUntilRenewal}d until renewal`, color: "#f59e0b" }
        : { label: `${d.daysUntilRenewal}d until renewal`, color: "#22c55e" }
    : null;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Welcome banner */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: "linear-gradient(135deg, #0B1437 0%, #1A2035 60%, #0D1B2A 100%)" }}
      >
        <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ background: "#00C4A7" }} />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-lg text-black"
            style={{ background: "#00C4A7" }}>
            {(d?.client?.companyName ?? user?.name ?? "C")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {d?.client?.companyName ?? user?.name ?? "Welcome"}
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {d?.client?.contractType} · {d?.client?.monthlyFee ? fmtCurrency(d.client.monthlyFee) + "/mo" : ""}
              {renewalAlert && (
                <span className="ml-2 font-medium" style={{ color: renewalAlert.color }}>
                  · {renewalAlert.label}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          index={0}
          label="Active Tasks"
          value={(d?.tasks.todo ?? 0) + (d?.tasks.inProgress ?? 0) + (d?.tasks.inReview ?? 0)}
          sub={`${d?.tasks.total ?? 0} total`}
          icon={<CheckSquare size={18} style={{ color: "#00C4A7" }} />}
          accent="#00C4A7"
        />
        <StatCard
          index={1}
          label="Tasks Done"
          value={d?.tasks.done ?? 0}
          icon={<TrendingUp size={18} style={{ color: "#22c55e" }} />}
          accent="#22c55e"
        />
        <StatCard
          index={2}
          label="Pending Invoices"
          value={fmtCurrency(d?.invoices.pending ?? 0)}
          sub={d?.invoices.overdue ? `₹${fmtCurrency(d.invoices.overdue)} overdue` : undefined}
          icon={<FileText size={18} style={{ color: "#f59e0b" }} />}
          accent="#f59e0b"
        />
        <StatCard
          index={3}
          label="Total Paid"
          value={fmtCurrency(d?.invoices.paid ?? 0)}
          icon={<Building2 size={18} style={{ color: "#6366f1" }} />}
          accent="#6366f1"
        />
      </div>

      {/* Task status breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: "280ms" }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CheckSquare size={16} className="text-primary" /> Task Status
          </h2>
          <div className="space-y-3">
            {([
              ["To Do",       d?.tasks.todo ?? 0,       "TODO"],
              ["In Progress", d?.tasks.inProgress ?? 0, "IN_PROGRESS"],
              ["In Review",   d?.tasks.inReview ?? 0,   "IN_REVIEW"],
              ["Done",        d?.tasks.done ?? 0,        "DONE"],
            ] as [string, number, string][]).map(([label, count, status]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: STATUS_COLORS[status] }} />
                <span className="text-sm flex-1 text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
          <Link href="/client-portal/tasks"
            className="text-xs text-primary hover:underline mt-4 inline-block">
            View all tasks →
          </Link>
        </div>

        {/* Contract info */}
        <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: "350ms" }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" /> Contract
          </h2>
          <div className="space-y-3">
            {[
              ["Type",       d?.client?.contractType ?? "—"],
              ["Monthly Fee", d?.client?.monthlyFee ? fmtCurrency(d.client.monthlyFee) : "—"],
              ["Start",      d?.client?.contractStart ? new Date(d.client.contractStart).toLocaleDateString("en-IN") : "—"],
              ["End",        d?.client?.contractEnd   ? new Date(d.client.contractEnd  ).toLocaleDateString("en-IN") : "—"],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
            {renewalAlert && (
              <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2"
                style={{ background: `${renewalAlert.color}14` }}>
                <AlertTriangle size={14} style={{ color: renewalAlert.color }} />
                <span className="text-xs font-medium" style={{ color: renewalAlert.color }}>
                  {renewalAlert.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent task activity */}
      {(d?.recentTasks?.length ?? 0) > 0 && (
        <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5" style={{ animationDelay: "420ms" }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary" /> Recent Task Activity
          </h2>
          <ul className="divide-y divide-border">
            {d!.recentTasks.map(t => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.assigneeName && (
                    <p className="text-xs text-muted-foreground mt-0.5">Assigned to {t.assigneeName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-xs border-0 font-medium"
                    style={{ background: `${PRIORITY_COLORS[t.priority]}18`, color: PRIORITY_COLORS[t.priority] }}
                  >
                    {t.priority}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs border-0"
                    style={{ background: `${STATUS_COLORS[t.status]}18`, color: STATUS_COLORS[t.status] }}
                  >
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/client-portal/tasks"
            className="text-xs text-primary hover:underline mt-3 inline-block">
            View all tasks →
          </Link>
        </div>
      )}
    </div>
  );
}
