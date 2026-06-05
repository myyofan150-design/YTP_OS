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
  CalendarClock, Loader2, TrendingUp, AlertCircle, CreditCard, ListTodo,
} from "lucide-react";
import { SubscriptionDashboardWidgets } from "@/components/modules/subscriptions/SubscriptionDashboardWidgets";
import { EmployeeDashboardWidgets } from "@/components/modules/employees/EmployeeDashboardWidgets";
import { Badge } from "@/components/ui/badge";
import EmployeeSelfPortal from "@/app/(dashboard)/my-profile/page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  clients:   { total: number; active: number; prospect: number };
  employees: { total: number; active: number };
  tasks:     { total: number; todo: number; inProgress: number; done: number };
  todos:     { total: number; pending: number; completed: number };
  invoices:  { thisMonthTotal: number; paid: number; pending: number; overdue: number };
  payroll:   { thisMonth: number; paid: number; draft: number };
  renewals:  { count: number; list: { id: number; uuid: string; companyName: string; contractEnd: string }[] };
}

interface RevenuePoint { month: string; amount: number }
interface TaskPoint    { status: string; count: number }

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

const PIE_COLORS = ["#1A2035", "#00C4A7", "#f59e0b", "#22c55e"];

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
  index?: number;
}

function StatCard({ label, value, sub, icon, accentColor, iconBg, index = 0 }: StatCardProps) {
  return (
    <div
      className="group card-hover animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Accent top line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 70%)` }}
      />
      {/* Corner glow on hover */}
      <div
        className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-300"
        style={{ background: accentColor }}
      />

      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl p-2.5" style={{ background: iconBg }}>
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
      <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">My Open Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks assigned to you</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map(t => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-foreground truncate">{t.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {t.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">{t.status.replace("_"," ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/tasks" className="text-xs text-primary hover:underline mt-3 inline-block">
          View all tasks →
        </Link>
      </div>
    </div>
  );
}

// ─── Chart Card ──────────────────────────────────────────────────────────────

function ChartCard({ title, icon, children, delay = 0 }: {
  title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode; delay?: number;
}) {
  return (
    <div
      className="card-hover animate-fade-up rounded-2xl border border-border bg-card p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}{title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role && ["SUPER_ADMIN","ADMIN"].includes(user.role);
  const isHR      = user?.role && ["SUPER_ADMIN","ADMIN","HR"].includes(user.role);
  const isFinance = user?.role && ["SUPER_ADMIN","ADMIN","ACCOUNTANT"].includes(user.role);

  const [stats, setStats]     = useState<DashStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [taskChart, setTC]    = useState<TaskPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<void>[] = [];
      if (isAdmin)   promises.push(api.get("/dashboard/stats").then(r => setStats(r.data.data)).catch(() => {}));
      if (isFinance) promises.push(api.get("/dashboard/revenue-chart").then(r => setRevenue(r.data.data)).catch(() => {}));
      promises.push(api.get("/dashboard/task-chart").then(r => setTC(r.data.data)).catch(() => {}));
      await Promise.all(promises);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isFinance, isHR]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  // EMPLOYEE view — full self-service portal
  if (user.role === "EMPLOYEE") {
    return <EmployeeSelfPortal />;
  }

  // TEAM_LEAD view — welcome + tasks only
  if (user.role === "TEAM_LEAD") {
    return (
      <div className="space-y-6">
        <div
          className="animate-fade-up relative overflow-hidden rounded-2xl px-6 py-6"
          style={{ background: "linear-gradient(135deg, #0B1437 0%, #1A2035 60%, #0D1B2A 100%)" }}
        >
          <div className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: "#00C4A7" }} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-teal-300 text-sm">Welcome back,</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">{user.name}</h2>
            </div>
            <Badge variant={getRoleBadgeVariant(user.role)} className="bg-white/15 border-white/25 text-white text-xs backdrop-blur-sm">
              {user.role.replace("_"," ")}
            </Badge>
          </div>
        </div>
        <EmployeeDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="animate-fade-up relative overflow-hidden rounded-2xl px-6 py-6"
        style={{ background: "linear-gradient(135deg, #0B1437 0%, #1A2035 55%, #0D1B2A 100%)" }}
      >
        <div className="pointer-events-none absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: "#00C4A7" }} />
        <div className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ background: "#1A2035" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-teal-300 text-sm">Welcome back,</p>
            <h2 className="text-2xl font-bold text-white mt-0.5">{user.name}</h2>
            <p className="text-teal-400/60 text-xs mt-1">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge className="bg-white/15 border-white/25 text-white text-xs backdrop-blur-sm">
            {user.role.replace("_"," ")}
          </Badge>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading dashboard…
        </div>
      )}

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            index={0}
            label="Active Clients"
            value={stats.clients.active}
            sub={`${stats.clients.total} total`}
            icon={<Users className="h-4 w-4" style={{ color: "#3b82f6" }} />}
            accentColor="#3b82f6"
            iconBg="rgba(59,130,246,.12)"
          />
          <StatCard
            index={1}
            label="Employees"
            value={stats.employees.active}
            sub={`${stats.employees.total} total`}
            icon={<UserCheck className="h-4 w-4" style={{ color: "#22c55e" }} />}
            accentColor="#22c55e"
            iconBg="rgba(34,197,94,.12)"
          />
          <StatCard
            index={2}
            label="Open Tasks"
            value={stats.tasks.todo + stats.tasks.inProgress}
            sub={`${stats.tasks.done} done`}
            icon={<CheckSquare className="h-4 w-4" style={{ color: "#f59e0b" }} />}
            accentColor="#f59e0b"
            iconBg="rgba(245,158,11,.12)"
          />
          <StatCard
            index={3}
            label="Monthly Revenue"
            value={fmtCurrency(stats.invoices.thisMonthTotal)}
            sub="this month"
            icon={<TrendingUp className="h-4 w-4" style={{ color: "#007A6E" }} />}
            accentColor="#007A6E"
            iconBg="rgba(0,122,110,.12)"
          />
          <StatCard
            index={4}
            label="Pending Invoices"
            value={stats.invoices.pending}
            sub={stats.invoices.overdue > 0 ? `${stats.invoices.overdue} overdue` : undefined}
            icon={<FileText className="h-4 w-4" style={{ color: "#a855f7" }} />}
            accentColor="#a855f7"
            iconBg="rgba(168,85,247,.12)"
          />
          <StatCard
            index={5}
            label="Renewals Due"
            value={stats.renewals.count}
            sub="within 30 days"
            icon={<CalendarClock className="h-4 w-4" style={{ color: "#ef4444" }} />}
            accentColor="#ef4444"
            iconBg="rgba(239,68,68,.12)"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isFinance && revenue.length > 0 && (
          <ChartCard
            delay={200}
            title="Revenue (last 6 months)"
            icon={<DollarSign className="h-4 w-4 text-primary" />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCurrency(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" fill="#00C4A7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {taskChart.length > 0 && (
          <ChartCard
            delay={300}
            title="Tasks by Status"
            icon={<CheckSquare className="h-4 w-4 text-amber-500" />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskChart}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
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
          </ChartCard>
        )}
      </div>

      {/* Renewals row */}
      {stats && stats.renewals.list.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            delay={400}
            title="Renewals Due Soon"
            icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          >
            <ul className="divide-y divide-border">
              {stats.renewals.list.map(c => {
                const days = Math.ceil((new Date(c.contractEnd).getTime() - Date.now()) / 86400000);
                return (
                  <li key={c.id} className="py-2.5 flex items-center justify-between group">
                    <Link href={`/clients/${c.uuid}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {c.companyName}
                    </Link>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      days <= 7
                        ? "bg-red-500/12 text-red-600 dark:text-red-400"
                        : "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                    }`}>
                      {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
        </div>
      )}

      {/* Todo & Task metrics — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {stats && (
          <ChartCard
            delay={500}
            title="Todo Metrics"
            icon={<ListTodo className="h-4 w-4 text-violet-500" />}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <span className="text-xl font-bold text-amber-500">{stats.todos.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <span className="text-xl font-bold text-emerald-500">{stats.todos.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <span className="text-xl font-bold">{stats.todos.total}</span>
              </div>
            </div>
            {stats.todos.total > 0 && (
              <>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
                  <div className="bg-amber-400 transition-all" style={{ width: `${(stats.todos.pending / stats.todos.total) * 100}%` }} />
                  <div className="bg-emerald-400 transition-all" style={{ width: `${(stats.todos.completed / stats.todos.total) * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {Math.round((stats.todos.completed / stats.todos.total) * 100)}% completed
                </p>
              </>
            )}
          </ChartCard>
        )}

        {stats && (
          <ChartCard
            delay={600}
            title="Task Metrics"
            icon={<CheckSquare className="h-4 w-4 text-amber-500" />}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-muted-foreground">To Do</span>
                </div>
                <span className="text-xl font-bold text-amber-500">{stats.tasks.todo}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-sm text-muted-foreground">In Progress</span>
                </div>
                <span className="text-xl font-bold text-blue-500">{stats.tasks.inProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-muted-foreground">Done</span>
                </div>
                <span className="text-xl font-bold text-emerald-500">{stats.tasks.done}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <span className="text-xl font-bold">{stats.tasks.total}</span>
              </div>
            </div>
            {stats.tasks.total > 0 && (
              <>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
                  <div className="bg-amber-400 transition-all" style={{ width: `${(stats.tasks.todo / stats.tasks.total) * 100}%` }} />
                  <div className="bg-blue-400 transition-all"   style={{ width: `${(stats.tasks.inProgress / stats.tasks.total) * 100}%` }} />
                  <div className="bg-emerald-400 transition-all" style={{ width: `${(stats.tasks.done / stats.tasks.total) * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {Math.round((stats.tasks.done / stats.tasks.total) * 100)}% complete
                </p>
              </>
            )}
          </ChartCard>
        )}
      </div>

      {/* Employee widgets */}
      {isHR && (
        <div className="animate-fade-up" style={{ animationDelay: "550ms" }}>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-500" />
            Employees
          </h2>
          <EmployeeDashboardWidgets />
        </div>
      )}

      {/* Subscriptions section */}
      {(isAdmin || isFinance) && (
        <div className="animate-fade-up" style={{ animationDelay: "600ms" }}>
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Subscriptions
          </h2>
          <SubscriptionDashboardWidgets />
        </div>
      )}
    </div>
  );
}
