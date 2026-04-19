"use client";

// src/app/(dashboard)/layout.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";
import api from "@/lib/api";
import type { Notification } from "@/types";
import {
  LayoutDashboard, Users, UserCheck, CheckSquare, Clock,
  CalendarOff, DollarSign, FileText, Grid3X3, BarChart3,
  Bell, LogOut, ChevronRight, ShieldCheck, UserCircle,
  Activity, CheckCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/",             icon: LayoutDashboard },
  { label: "Clients",    href: "/clients",       icon: Users },
  { label: "Employees",  href: "/employees",     icon: UserCheck },
  { label: "Tasks",      href: "/tasks",         icon: CheckSquare },
  { label: "Attendance", href: "/attendance",    icon: Clock },
  { label: "Leave",      href: "/leave",         icon: CalendarOff },
  { label: "Payroll",    href: "/payroll",       icon: DollarSign },
  { label: "Invoices",   href: "/invoices",      icon: FileText },
  { label: "Workspace",  href: "/workspace",     icon: Grid3X3 },
  { label: "Reports",    href: "/reports",       icon: BarChart3 },
  { label: "Users",         href: "/users",         icon: ShieldCheck, roles: ["SUPER_ADMIN","ADMIN"] },
  { label: "Activity Logs", href: "/activity-logs", icon: Activity,    roles: ["SUPER_ADMIN","ADMIN"] },
];

const PAGE_TITLES: Record<string, string> = {
  "/":               "Dashboard",
  "/clients":        "Clients",
  "/employees":      "Employees",
  "/tasks":          "Tasks",
  "/attendance":     "Attendance",
  "/leave":          "Leave Management",
  "/payroll":        "Payroll",
  "/invoices":       "Invoices",
  "/workspace":      "Workspace",
  "/reports":        "Reports",
  "/users":          "User Management",
  "/profile":        "My Profile",
  "/notifications":  "Notifications",
  "/activity-logs":  "Activity Logs",
};

function getRoleBadgeColor(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-600",
    ADMIN:       "bg-blue-600",
    HR:          "bg-green-600",
    TEAM_LEAD:   "bg-yellow-600",
    EMPLOYEE:    "bg-slate-500",
    ACCOUNTANT:  "bg-orange-600",
  };
  return map[role] ?? "bg-slate-500";
}

function notifIcon(type: string) {
  const map: Record<string, string> = {
    LEAVE_REQUEST: "🏖️",
    TASK_DUE:      "✅",
    RENEWAL:       "🔄",
    INVOICE_DUE:   "💳",
    PAYROLL:       "💰",
    GENERAL:       "📢",
  };
  return map[type] ?? "🔔";
}

// ─── Notification Bell ────────────────────────────────────────────────────────

function NotificationBell() {
  const [count, setCount]       = useState(0);
  const [open, setOpen]         = useState(false);
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setCount(res.data.data.count);
    } catch { /* non-fatal */ }
  }, []);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { limit: 5 } });
      setNotifs(res.data.data.slice(0, 5));
    } catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  // Poll unread count every 60s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle() {
    if (!open) fetchNotifs();
    setOpen(v => !v);
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/read-all");
      setCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* non-fatal */ }
  }

  async function markRead(id: number) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setCount(c => Math.max(0, c - 1));
    } catch { /* non-fatal */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notifications</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <CheckCheck size={12} />Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    !n.isRead ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <span className="text-lg shrink-0">{notifIcon(n.type)}</span>
                  <div className="min-w-0">
                    <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-indigo-600 hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname === k || (k !== "/" && pathname.startsWith(k)))?.[1] ?? "Agency OS";
  const initials  = (user?.name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const visibleNav = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role ?? ""));
  const mainNav    = visibleNav.filter(i => !i.roles);
  const adminNav   = visibleNav.filter(i => i.roles);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function NavLink({ item }: { item: NavItem }) {
    const { label, href, icon: Icon } = item;
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <li>
        <Link
          href={href}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? "border-l-2 border-indigo-500 bg-[#1E293B] text-white pl-[10px]"
              : "text-slate-400 hover:bg-[#1E293B] hover:text-white"
          }`}
        >
          <Icon size={16} className={isActive ? "text-indigo-400" : ""} />
          {label}
          {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
        </Link>
      </li>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-[#0F172A] text-slate-300 shrink-0">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
            AO
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">Agency OS</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {mainNav.map(item => <NavLink key={item.href} item={item} />)}
          </ul>
          {adminNav.length > 0 && (
            <>
              <div className="my-3 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Administration
                </p>
              </div>
              <ul className="space-y-0.5">
                {adminNav.map(item => <NavLink key={item.href} item={item} />)}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${getRoleBadgeColor(user?.role ?? "")}`}>
                {user?.role?.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <Link href="/profile" className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors">
            <UserCircle size={13} />My Profile
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-[#1E293B] hover:text-red-400 transition-colors">
            <LogOut size={13} />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0">
          <h1 className="text-base font-semibold text-slate-800">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
