"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

interface TimelineEntry {
  id: number;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
  createdAt: string;
  actorId: number;
  actorName: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAction(action: string, actorName: string): string {
  const map: Record<string, string> = {
    "client.created":           "created this client",
    "client.updated":           "updated client details",
    "client.deleted":           "marked client as churned",
    "client.credential_added":  "added a credential",
    "client.credential_deleted":"deleted a credential",
    "client.document_deleted":  "deleted a document",
    "client.contact_added":     "added a contact",
    "client.payment_recorded":  "recorded a payment",
    "client.payment_deleted":   "deleted a payment",
    "client.tracking_updated":  "updated tracking info",
  };
  return `${actorName} ${map[action] ?? action}`;
}

function InitialAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

interface Props { clientUuid: string; }

export function ActivityTab({ clientUuid }: Props) {
  const [logs, setLogs]       = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<TimelineEntry[]>>(`/clients/${clientUuid}/timeline`);
      setLogs(res.data.data);
    } catch {
      setLogs([]);
    } finally { setLoading(false); }
  }, [clientUuid]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return <p className="text-center py-10 text-sm text-slate-400">Loading activity…</p>;

  if (logs.length === 0) return <p className="text-center py-10 text-sm text-slate-400">No activity recorded yet.</p>;

  return (
    <div className="space-y-0">
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          {/* Left: avatar + connector */}
          <div className="flex flex-col items-center">
            <InitialAvatar name={log.actorName} />
            {i < logs.length - 1 && <div className="w-px flex-1 mt-1 mb-1" style={{ background: "var(--border)" }} />}
          </div>
          {/* Right: content */}
          <div className="pb-5 min-w-0 flex-1">
            <p className="text-sm text-slate-700">{formatAction(log.action, log.actorName)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}{timeAgo(log.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
