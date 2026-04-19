"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

function RevenueReport() {
  const [data, setData]   = useState<{ month: string; amount: number }[]>([]);
  const [loading, setL]   = useState(true);

  useEffect(() => {
    api.get("/dashboard/revenue-chart")
       .then(r => setData(r.data.data))
       .catch(() => {})
       .finally(() => setL(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>;

  const total = data.reduce((s, d) => s + d.amount, 0);
  const peak  = data.reduce((m, d) => d.amount > m.amount ? d : m, data[0] ?? { month: "", amount: 0 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue (12mo)", value: `₹${total.toLocaleString("en-IN")}` },
          { label: "Peak Month",           value: peak.month },
          { label: "Peak Revenue",         value: fmtCurrency(peak.amount) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Monthly Revenue (last 12 months)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={i === data.length - 1 ? "#6366f1" : "#a5b4fc"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceReport() {
  const [employees, setEmp] = useState<{ id: number; employeeCode: string; user: { name: string } }[]>([]);
  const [empId, setEmpId]   = useState("");
  const [month, setMonth]   = useState(() => new Date().toISOString().slice(0, 7));
  const [logs, setLogs]     = useState<{ date: string; type: string }[]>([]);
  const [loading, setL]     = useState(false);

  useEffect(() => {
    api.get("/employees", { params: { limit: 200 } })
       .then(r => {
         const list = r.data.data.employees ?? r.data.data;
         setEmp(list);
         if (list.length > 0) setEmpId(String(list[0].id));
       })
       .catch(() => {});
  }, []);

  useEffect(() => {
    if (!empId) return;
    setL(true);
    const [y, m] = month.split("-");
    api.get(`/attendance/employee/${empId}`, { params: { month: m, year: y } })
       .then(r => setLogs(r.data.data.logs ?? []))
       .catch(() => setLogs([]))
       .finally(() => setL(false));
  }, [empId, month]);

  const typeColor: Record<string, string> = {
    PRESENT:   "bg-green-400",
    HALF_DAY:  "bg-yellow-400",
    LEAVE:     "bg-blue-400",
    ABSENT:    "bg-red-300",
    COMP_OFF:  "bg-purple-400",
    HOLIDAY:   "bg-gray-300",
  };

  const [y, m] = month.split("-");
  const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
  const firstDay    = (new Date(parseInt(y), parseInt(m) - 1, 1).getDay() + 6) % 7; // Mon-based

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <select
          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={empId}
          onChange={e => setEmpId(e.target.value)}
        >
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.user.name} ({e.employeeCode})</option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(typeColor).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`h-3 w-3 rounded-sm ${color}`} />{type.replace("_"," ")}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${y}-${m}-${String(day).padStart(2,"0")}`;
              const log = logs.find(l => l.date === dateStr);
              const isToday = dateStr === new Date().toISOString().slice(0,10);
              const isFuture = new Date(dateStr) > new Date();
              return (
                <div
                  key={day}
                  className={`aspect-square rounded flex items-center justify-center text-xs font-medium
                    ${isFuture ? "text-gray-300" : log ? `${typeColor[log.type]} text-white` : "bg-red-100 text-red-600"}
                    ${isToday ? "ring-2 ring-indigo-400" : ""}
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksReport() {
  const [data, setData] = useState<{ status: string; count: number }[]>([]);
  const [loading, setL] = useState(true);

  useEffect(() => {
    api.get("/dashboard/task-chart")
       .then(r => setData(r.data.data))
       .catch(() => {})
       .finally(() => setL(false));
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = { TODO: "#94a3b8", IN_PROGRESS: "#6366f1", IN_REVIEW: "#f59e0b", DONE: "#22c55e" };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {data.map(d => (
          <div key={d.status} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{d.status.replace("_"," ")}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{d.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">{total > 0 ? ((d.count/total)*100).toFixed(0) : 0}%</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Task Distribution</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="status" type="category" tick={{ fontSize: 11 }} tickFormatter={v => v.replace("_"," ")} width={80} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={colors[d.status as keyof typeof colors] ?? "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["Revenue", "Attendance", "Tasks"] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Revenue");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and insights across modules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Revenue"    && <RevenueReport />}
      {tab === "Attendance" && <AttendanceReport />}
      {tab === "Tasks"      && <TasksReport />}
    </div>
  );
}
