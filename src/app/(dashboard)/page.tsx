"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, UserCheck, CheckSquare, FileText, DollarSign,
  CalendarClock, Loader2, TrendingUp, Clock, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  clients:   { total: number; active: number; prospect: number };
  employees: { total: number; active: number };
  tasks:     { total: number; todo: number; inProgress: number; done: number };
  invoices:  { thisMonthTotal: number; paid: number; pending: number; overdue: number };
  payroll:   { thisMonth: number; paid: number; draft: number };
  renewals:  { count: number; list: { id: number; uuid: string; companyName: string; contractEnd: string }[] };
}

interface RevenuePoint { month: string; amount: number }
interface TaskPoint    { status: string; count: number }
interface AttSummary   { present: number; halfDay: number; onLeave: number; absent: number; total: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "default";
  if (role === "HR" || role === "TEAM_LEAD") return "secondary";
  return "outline";
}

const PIE_COLORS = ["#94a3b8", "#6366f1", "#f59e0b", "#22c55e"];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Employee Dashboard View ──────────────────────────────────────────────────

function EmployeeDashboard() {
  const [tasks, setTasks] = useState<{ id: number; title: string; status: string; priority: string; dueDate?: string | null }[]>([]);

  useEffect(() => {
    api.get("/tasks", { params: { limit: 5 } })
       .then(r => setTasks((r.data.data.tasks ?? r.data.data).slice(0, 5)))
       .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">My Open Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">No tasks assigned to you</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map(t => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-800 truncate">{t.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {t.dueDate && (
                    <span className="text-xs text-gray-400">
                      {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">{t.status.replace("_"," ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/tasks" className="text-xs text-indigo-600 hover:underline mt-3 inline-block">
          View all tasks →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role && ["SUPER_ADMIN","ADMIN"].includes(user.role);
  const isHR    = user?.role && ["SUPER_ADMIN","ADMIN","HR"].includes(user.role);
  const isFinance = user?.role && ["SUPER_ADMIN","ADMIN","ACCOUNTANT"].includes(user.role);

  const [stats, setStats]       = useState<DashStats | null>(null);
  const [revenue, setRevenue]   = useState<RevenuePoint[]>([]);
  const [taskChart, setTC]      = useState<TaskPoint[]>([]);
  const [att, setAtt]           = useState<AttSummary | null>(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<void>[] = [];

      if (isAdmin) {
        promises.push(
          api.get("/dashboard/stats").then(r => setStats(r.data.data)).catch(() => {})
        );
      }
      if (isFinance) {
        promises.push(
          api.get("/dashboard/revenue-chart").then(r => setRevenue(r.data.data)).catch(() => {})
        );
      }
      promises.push(
        api.get("/dashboard/task-chart").then(r => setTC(r.data.data)).catch(() => {})
      );
      if (isHR) {
        promises.push(
          api.get("/dashboard/attendance-summary").then(r => setAtt(r.data.data)).catch(() => {})
        );
      }

      await Promise.all(promises);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isFinance, isHR]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  // EMPLOYEE view
  if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-[#0F172A] px-6 py-5 text-white">
          <p className="text-slate-400 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1 bg-indigo-600 text-white border-none text-xs">
            {user.role.replace("_"," ")}
          </Badge>
        </div>
        <EmployeeDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-[#0F172A] px-6 py-5 text-white flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold">{user.name}</h2>
        </div>
        <Badge className="bg-indigo-600 text-white border-none text-xs">
          {user.role.replace("_"," ")}
        </Badge>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Active Clients"
            value={stats.clients.active}
            sub={`${stats.clients.total} total`}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Employees"
            value={stats.employees.active}
            sub={`${stats.employees.total} total`}
            icon={<UserCheck className="h-5 w-5 text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            label="Open Tasks"
            value={stats.tasks.todo + stats.tasks.inProgress}
            sub={`${stats.tasks.done} done`}
            icon={<CheckSquare className="h-5 w-5 text-yellow-600" />}
            color="bg-yellow-50"
          />
          <StatCard
            label="Monthly Revenue"
            value={fmtCurrency(stats.invoices.thisMonthTotal)}
            sub="this month (paid)"
            icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
            color="bg-indigo-50"
          />
          <StatCard
            label="Pending Invoices"
            value={stats.invoices.pending}
            sub={stats.invoices.overdue > 0 ? `${stats.invoices.overdue} overdue` : undefined}
            icon={<FileText className="h-5 w-5 text-purple-600" />}
            color="bg-purple-50"
          />
          <StatCard
            label="Renewals Due"
            value={stats.renewals.count}
            sub="within 30 days"
            icon={<CalendarClock className="h-5 w-5 text-red-600" />}
            color="bg-red-50"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        {isFinance && revenue.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-500" />Revenue (last 6 months)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => fmtCurrency(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Task chart */}
        {taskChart.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-yellow-500" />Tasks by Status
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskChart}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: any) => Number(props.count) > 0 ? `${String(props.status).replace("_"," ")} (${props.count})` : ""}
                  labelLine={false}
                  fontSize={10}
                >
                  {taskChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={v => v.replace("_"," ")} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewals */}
        {stats && stats.renewals.list.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />Renewals Due Soon
            </h2>
            <ul className="divide-y divide-gray-100">
              {stats.renewals.list.map(c => {
                const days = Math.ceil((new Date(c.contractEnd).getTime() - Date.now()) / 86400000);
                return (
                  <li key={c.id} className="py-2.5 flex items-center justify-between">
                    <Link href={`/clients/${c.uuid}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600">
                      {c.companyName}
                    </Link>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      days <= 7 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {days} days
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Attendance today */}
        {isHR && att && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />Today&apos;s Attendance
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Present", value: att.present,  color: "text-green-600 bg-green-50" },
                { label: "Half Day", value: att.halfDay, color: "text-yellow-600 bg-yellow-50" },
                { label: "On Leave", value: att.onLeave, color: "text-blue-600 bg-blue-50" },
                { label: "Absent",   value: att.absent,  color: "text-red-600 bg-red-50" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
              {att.total > 0 && <>
                <div className="bg-green-400" style={{ width: `${(att.present/att.total)*100}%` }} />
                <div className="bg-yellow-400" style={{ width: `${(att.halfDay/att.total)*100}%` }} />
                <div className="bg-blue-400"  style={{ width: `${(att.onLeave/att.total)*100}%` }} />
                <div className="bg-red-300"   style={{ width: `${(att.absent/att.total)*100}%` }} />
              </>}
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{att.total} active employees</p>
          </div>
        )}
      </div>
    </div>
  );
}
