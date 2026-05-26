"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { Notification } from "@/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";

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
    if (d === today)          groups["Today"].push(n);
    else if (d === yesterday) groups["Yesterday"].push(n);
    else                      groups["Earlier"].push(n);
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
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unread > 0 && <p className="text-sm text-muted-foreground mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="h-8 text-xs gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <span className="h-5 w-5 rounded-full border-2 border-border border-t-primary animate-spin" />
          Loading...
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground animate-fade-up">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label} className="animate-fade-up">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</h2>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
                    className={`w-full text-left px-5 py-4 flex gap-4 hover:bg-muted/40 transition-colors ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="text-2xl shrink-0">{notifIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
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
