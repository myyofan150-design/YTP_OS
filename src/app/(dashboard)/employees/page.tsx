"use client";

// src/app/(dashboard)/employees/page.tsx
// Employee list page: stats, search/filter, table.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { AddEmployeeModal } from "@/components/modules/employees/AddEmployeeModal";
import { EmpStatusBadge } from "@/components/modules/employees/EmpStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee, ApiResponse } from "@/types";

const CAN_CREATE = ["SUPER_ADMIN", "ADMIN", "HR"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);

  const canCreate = CAN_CREATE.includes(user?.role ?? "");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params["search"] = search;
      if (statusFilter !== "ALL") params["status"] = statusFilter;
      if (deptFilter !== "ALL")   params["department"] = deptFilter;
      const res = await api.get<ApiResponse<Employee[]>>("/employees", { params });
      setEmployees(res.data.data);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, deptFilter]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchEmployees, search]);

  // Compute stats
  const total    = employees.length;
  const active   = employees.filter((e) => e.status === "ACTIVE").length;
  const notice   = employees.filter((e) => e.status === "NOTICE_PERIOD").length;
  const depts    = new Set(employees.map((e) => e.department).filter(Boolean)).size;

  // All unique departments for filter
  const allDepts = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your team members</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setAddOpen(true)}
            className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
          >
            + Add Employee
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={total} />
        <StatCard label="Active" value={active} />
        <StatCard label="On Notice" value={notice} sub="Notice period" />
        <StatCard label="Departments" value={depts} sub="Unique departments" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search name, email, code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs text-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
            <SelectItem value="ACTIVE"        className="text-sm">Active</SelectItem>
            <SelectItem value="INACTIVE"      className="text-sm">Inactive</SelectItem>
            <SelectItem value="NOTICE_PERIOD" className="text-sm">Notice Period</SelectItem>
            <SelectItem value="TERMINATED"    className="text-sm">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-sm">All Departments</SelectItem>
            {allDepts.map((d) => (
              <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "ALL" || deptFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("ALL"); setDeptFilter("ALL"); }} className="text-xs text-slate-500">
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Shift</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No employees found.</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.uuid} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500">{emp.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.user.name} url={emp.user.avatarUrl} />
                        <div>
                          <p className="font-medium text-slate-800">{emp.user.name}</p>
                          <p className="text-xs text-slate-400">{emp.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.designation ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {emp.shiftStart}–{emp.shiftEnd}
                    </td>
                    <td className="px-4 py-3">
                      <EmpStatusBadge status={emp.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(emp.joiningDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/employees/${emp.uuid}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchEmployees}
      />
    </div>
  );
}
