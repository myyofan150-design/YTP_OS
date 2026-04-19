"use client";

// src/app/(dashboard)/clients/page.tsx
// Client management list page: stats, search/filter, table.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ClientModal } from "@/components/modules/clients/ClientModal";
import { StatusBadge } from "@/components/modules/clients/StatusBadge";
import { ContractBadge } from "@/components/modules/clients/ContractBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, ApiResponse } from "@/types";

const CAN_CREATE = ["SUPER_ADMIN", "ADMIN"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function RenewalChip({ days }: { days: number | null | undefined }) {
  if (days == null) return <span className="text-slate-400 text-xs">—</span>;
  if (days < 0)   return <span className="text-xs text-red-600 font-medium">Expired</span>;
  if (days <= 7)  return <span className="text-xs text-red-600 font-semibold">{days}d left</span>;
  if (days <= 30) return <span className="text-xs text-amber-600 font-medium">{days}d left</span>;
  return <span className="text-xs text-slate-500">{days}d left</span>;
}

export default function ClientsPage() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const canCreate = CAN_CREATE.includes(user?.role ?? "");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params["search"] = search;
      if (statusFilter !== "ALL") params["status"] = statusFilter;
      const res = await api.get<ApiResponse<Client[]>>("/clients", { params });
      setClients(res.data.data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchClients, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchClients, search]);

  // Stats
  const total    = clients.length;
  const active   = clients.filter((c) => c.status === "ACTIVE").length;
  const revenue  = clients.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + (c.monthlyFee ?? 0), 0);
  const renewals = clients.filter((c) => (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0).length;

  function openAdd() {
    setEditClient(null);
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditClient(c);
    setModalOpen(true);
  }

  function formatDate(s?: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your agency&apos;s client portfolio</p>
        </div>
        {canCreate && (
          <Button
            onClick={openAdd}
            className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
          >
            + Add Client
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={total} />
        <StatCard label="Active" value={active} sub={`${total - active} inactive / churned`} />
        <StatCard label="Monthly Revenue" value={`₹${revenue.toLocaleString("en-IN")}`} sub="Active clients only" />
        <StatCard
          label="Renewals Due"
          value={renewals}
          sub="Within next 30 days"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs text-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
            <SelectItem value="ACTIVE"   className="text-sm">Active</SelectItem>
            <SelectItem value="INACTIVE" className="text-sm">Inactive</SelectItem>
            <SelectItem value="PROSPECT" className="text-sm">Prospect</SelectItem>
            <SelectItem value="ON_HOLD"  className="text-sm">On Hold</SelectItem>
            <SelectItem value="CHURNED"  className="text-sm">Churned</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("ALL"); }} className="text-xs text-slate-500">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Renewal</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Tasks</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No clients found.</td>
                </tr>
              ) : (
                clients.map((c) => {
                  const renewingSoon = (c.daysUntilRenewal ?? Infinity) <= 30 && (c.daysUntilRenewal ?? Infinity) >= 0;
                  return (
                    <tr
                      key={c.uuid}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${renewingSoon ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/clients/${c.uuid}`} className="font-semibold text-slate-800 hover:text-indigo-700">
                          {c.companyName}
                        </Link>
                        {c.assignedToName && (
                          <p className="text-xs text-slate-400 mt-0.5">Assigned: {c.assignedToName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{c.contactPerson}</p>
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ContractBadge type={c.contractType} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {c.monthlyFee != null ? `₹${c.monthlyFee.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-slate-500">{formatDate(c.contractEnd)}</p>
                          <RenewalChip days={c.daysUntilRenewal} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.activeTasks != null && c.activeTasks > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold w-6 h-6">
                            {c.activeTasks}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/clients/${c.uuid}`}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                          >
                            View
                          </Link>
                          {canCreate && (
                            <button
                              onClick={() => openEdit(c)}
                              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal
        client={editClient}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchClients}
      />
    </div>
  );
}
