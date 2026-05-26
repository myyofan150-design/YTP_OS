"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Audit trail of all system actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-in delay-100">
        <Input
          placeholder="Filter by action..."
          value={action}
          onChange={e => setAction(e.target.value)}
          className="h-9 w-56 text-sm"
        />
        <Select value={entityType || "_all"} onValueChange={(v: string | null) => setET(v === "_all" || !v ? "" : v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {ENTITY_TYPES.filter(Boolean).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No activity logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground text-xs">{log.user?.name ?? "System"}</div>
                    <div className="text-xs text-muted-foreground">{log.user?.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{log.entityType}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{log.entityId ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground/60">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} total logs</span>
          <div className="flex items-center gap-2">
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
