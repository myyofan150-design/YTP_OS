"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { Notification } from "@/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCheck, Loader2 } from "lucide-react";

function notifIcon(type: string) {
  const map: Record<string, string> = {
    LEAVE_REQUEST: "🏖️", TASK_DUE: "✅", RENEWAL: "🔄",
    INVOICE_DUE: "💳", PAYROLL: "💰", GENERAL: "📢",
  };
  return map[type] ?? "🔔";
}

function groupByDay(notifs: Notification[]) {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };

  notifs.forEach(n => {
    const d = new Date(n.createdAt).toDateString();
    if (d === today)     groups["Today"].push(n);
    else if (d === yesterday) groups["Yesterday"].push(n);
    else                 groups["Earlier"].push(n);
  });

  return groups;
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifs(res.data.data);
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    await api.patch("/notifications/read-all").catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  async function markRead(id: number) {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  const unread = notifs.filter(n => !n.isRead).length;
  const groups = groupByDay(notifs);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{label}</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
                    className={`w-full text-left px-5 py-4 flex gap-4 hover:bg-gray-50 transition-colors ${
                      !n.isRead ? "bg-indigo-50/30" : ""
                    }`}
                  >
                    <span className="text-2xl shrink-0">{notifIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}
