"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: number;
  ipAddress?: string;
  createdAt: string;
  user?: { id: number; name: string; email: string } | null;
}

const ENTITY_TYPES = ["", "Client", "Employee", "Task", "INVOICE", "INVOICE_ITEM", "PayrollRecord", "LeaveRequest", "AttendanceLog", "User"];

export default function ActivityLogsPage() {
  const [logs, setLogs]           = useState<ActivityLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [entityType, setET]       = useState("");
  const [action, setAction]       = useState("");
  const [page, setPage]           = useState(1);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (entityType) params["entityType"] = entityType;
      if (action)     params["action"]     = action;
      const res = await api.get("/dashboard/activity-logs", { params });
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, action, page]);

  useEffect(() => { setPage(1); }, [entityType, action]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Audit trail of all system actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter by action..."
          value={action}
          onChange={e => setAction(e.target.value)}
          className="w-56"
        />
        <Select value={entityType || "_all"} onValueChange={v => setET(v === "_all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {ENTITY_TYPES.filter(Boolean).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No activity logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{log.user?.name ?? "System"}</div>
                    <div className="text-xs text-gray-400">{log.user?.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{log.entityType}</td>
                  <td className="px-4 py-2.5 text-gray-500">{log.entityId ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} total logs</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="px-3 py-1.5 text-xs">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
