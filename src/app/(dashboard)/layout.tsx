"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

import { timeAgo } from "@/lib/utils";
import api from "@/lib/api";
import type { Notification } from "@/types";
import {
  LayoutDashboard, Building2, Users, CheckSquare,
  Clock, CalendarDays, Banknote, FileText, BarChart3, ScrollText,
  Shield, UserCircle, Bell, LogOut, Search, Menu, X, Lock,
  CheckCheck, CreditCard, UserPlus,
  Star, UserCheck, AlertCircle, CheckCircle2,
  ChevronDown, ChevronRight, ChevronLeft, ListTodo, Plus,
  Archive, Trash2, Settings, MessageSquare,
  PanelLeftClose, PanelLeftOpen, IdCard, KeyRound,
} from "lucide-react";
import { useTotalUnread } from "@/hooks/useChat";
import { useSettings } from "@/hooks/useSettings";
import { resolveAssetUrl } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";

// ─── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem { label: string; href: string; icon: React.ElementType; roles?: string[]; }
interface NavSection { label: string; icon: React.ElementType; items: NavItem[]; }

// Client portal nav — shown only to CLIENT role users
const CLIENT_NAV: NavItem[] = [
  { label: "Dashboard",  href: "/",                       icon: LayoutDashboard },
  { label: "Tasks",      href: "/client-portal/tasks",    icon: CheckSquare     },
  { label: "Invoices",   href: "/client-portal/invoices", icon: FileText        },
  { label: "My Profile", href: "/client-portal/profile",  icon: UserCircle      },
];

// Top-level standalone links — always visible, no collapse
const STANDALONE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/",     icon: LayoutDashboard },
  { label: "Chat",      href: "/chat", icon: MessageSquare   },
];

// Collapsible groups
const NAV_SECTIONS: NavSection[] = [
  {
    label: "CRM",
    icon: Building2,
    items: [
      { label: "Leads",    href: "/leads",    icon: UserPlus,  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "HR", "TEAM_LEAD"] },
      { label: "Clients",  href: "/clients",  icon: Building2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "HR", "TEAM_LEAD"] },
      { label: "Invoices", href: "/invoices", icon: FileText,  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "HR", "TEAM_LEAD"] },
    ],
  },
  {
    label: "Work Management",
    icon: CheckSquare,
    items: [
      { label: "Tasks",  href: "/tasks",  icon: CheckSquare },
      { label: "To Do",  href: "/todo",   icon: ListTodo    },
    ],
  },
  {
    label: "HR",
    icon: Users,
    items: [
      { label: "Employees",  href: "/employees",  icon: Users,        roles: ["SUPER_ADMIN","ADMIN","HR","TEAM_LEAD","ACCOUNTANT"] },
      { label: "Attendance", href: "/attendance", icon: Clock,        roles: ["SUPER_ADMIN","ADMIN","HR","TEAM_LEAD"] },
      { label: "Leave",      href: "/leave",      icon: CalendarDays, roles: ["SUPER_ADMIN","ADMIN","HR","TEAM_LEAD"] },
      { label: "Payroll",    href: "/payroll",    icon: Banknote,     roles: ["SUPER_ADMIN","ADMIN","HR","ACCOUNTANT"] },
    ],
  },
  {
    label: "Finance",
    icon: CreditCard,
    items: [
      { label: "Subscription", href: "/subscriptions", icon: CreditCard, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "HR", "TEAM_LEAD"] },
    ],
  },
  {
    label: "Administration",
    icon: Shield,
    items: [
      { label: "Users",           href: "/users",            icon: Shield,    roles: ["SUPER_ADMIN", "ADMIN"] },
      { label: "Activity Logs",   href: "/activity-logs",    icon: ScrollText, roles: ["SUPER_ADMIN", "ADMIN"] },
      { label: "Change Requests", href: "/change-requests",  icon: KeyRound,  roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/":                         "Dashboard",
  "/chat":                     "Chat",
  "/client-portal/tasks":    "Tasks",
  "/client-portal/invoices": "Invoices",
  "/client-portal/profile":  "My Profile",
  "/leads":         "Leads",
  "/clients":       "Clients",
  "/invoices":      "Invoices",
  "/tasks":         "Tasks",
  "/todo":          "To Do",
  "/employees":     "Employees",
  "/attendance":    "Attendance",
  "/leave":         "Leave Management",
  "/payroll":       "Payroll",
  "/subscriptions": "Subscription Tracker",
  "/users":         "User Management",
  "/activity-logs": "Activity Logs",
  "/profile":          "My Account",
  "/my-profile":       "My Profile",
  "/notifications":    "Notifications",
  "/settings":         "Settings",
  "/change-requests":  "Change Requests",
};



function notifIcon(type: string) {
  const map: Record<string, string> = {
    LEAVE_REQUEST: "🏖️", TASK_DUE: "✅", RENEWAL: "🔄",
    INVOICE_DUE: "💳", PAYROLL: "💰", GENERAL: "📢",
  };
  return map[type] ?? "🔔";
}



// ─── Notification Bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const [count,   setCount]   = useState(0);
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try { const r = await api.get("/notifications/unread-count"); setCount(r.data.data.count); }
    catch { /* non-fatal */ }
  }, []);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/notifications", { params: { limit: 5 } }); setNotifs(r.data.data.slice(0, 5)); }
    catch { /* non-fatal */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle() { if (!open) fetchNotifs(); setOpen(v => !v); }

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
        title="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
      >
        <Bell size={17} style={{ color: "var(--text-secondary)" }} />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
            style={{ background: "#ef4444" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden animate-slide-up"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Notifications
              </span>
              {count > 0 && (
                <span className="badge badge-accent">{count}</span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                <CheckCheck size={11} />Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {loading ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
            ) : notifs.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>No notifications</p>
            ) : notifs.map(n => (
              <button
                key={n.id}
                onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
                className="w-full text-left px-4 py-3 flex gap-3 transition-colors"
                style={{
                  background: !n.isRead ? "var(--bg-elevated)" : "transparent",
                  borderLeft: !n.isRead ? "2px solid var(--accent)" : "2px solid transparent",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="text-base shrink-0">{notifIcon(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm leading-snug"
                    style={{
                      color: !n.isRead ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: !n.isRead ? 600 : 400,
                    }}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{n.body}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat Badge Button ────────────────────────────────────────────────────────

function ChatBadgeButton({ count }: { count: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/chat")}
      title="Chat"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
    >
      <MessageSquare size={17} style={{ color: "var(--text-secondary)" }} />
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
          style={{ background: "#22c55e" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// ─── Lock Screen ─────────────────────────────────────────────────────────────

function LockScreen({
  user,
  initials,
  onUnlock,
}: {
  user: { name?: string; email?: string; avatarUrl?: string | null } | null;
  initials: string;
  onUnlock: () => void;
}) {
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [time, setTime]           = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    inputRef.current?.focus();
    return () => clearInterval(id);
  }, []);

  async function handleUnlock(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!password || !user?.email) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/login", { email: user.email, password });
      sessionStorage.removeItem("agency_locked");
      onUnlock();
    } catch {
      setError("Incorrect password. Please try again.");
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(135deg, #070d16 0%, #0d1b2a 40%, #071412 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #00C4A7 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full opacity-8" style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      </div>

      <div className="relative text-center mb-10">
        <p className="text-[88px] leading-none font-extralight tracking-tight text-white">
          {timeStr}
        </p>
        <p className="mt-2 text-base font-normal" style={{ color: "rgba(255,255,255,0.5)" }}>
          {dateStr}
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-5 w-80">
        {user?.avatarUrl ? (
          <img
            src={resolveAssetUrl(user.avatarUrl)!}
            alt={user.name ?? ""}
            className="h-20 w-20 rounded-full object-cover"
            style={{ boxShadow: "0 0 0 4px rgba(0,196,167,0.25)" }}
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full font-bold text-2xl text-black"
            style={{ background: "#00C4A7", boxShadow: "0 0 0 4px rgba(0,196,167,0.25)" }}
          >
            {initials}
          </div>
        )}

        <p className="text-lg font-semibold text-white">{user?.name}</p>

        <form onSubmit={handleUnlock} className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-center outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = "#00C4A7"; e.target.style.background = "rgba(255,255,255,0.12)"; }}
              onBlur={e => { if (!error) e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="text-center text-xs" style={{ color: "#f87171" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl py-3 text-sm font-semibold text-black transition-all duration-200"
            style={{
              background: loading || !password ? "rgba(0,196,167,0.35)" : "#00C4A7",
              cursor: loading || !password ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verifying…" : "Unlock"}
          </button>
        </form>

        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Session is locked. Enter your password to continue.
        </p>
      </div>
    </div>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────────────

const USER_MENU_ITEMS = [
  { label: "My Account",  icon: UserCircle, action: "account",  iconBg: "rgba(99,102,241,0.15)",  iconColor: "#818cf8" },
  { label: "Settings",    icon: Settings,   action: "settings", iconBg: "rgba(245,158,11,0.15)",  iconColor: "#fbbf24" },
  { label: "Lock Screen", icon: Lock,       action: "lock",     iconBg: "rgba(34,197,94,0.15)",   iconColor: "#4ade80" },
] as const;

function UserMenu({
  user,
  role,
  initials,
  onLogout,
  onLock,
}: {
  user: { name?: string; avatarUrl?: string | null } | null;
  role?: string;
  initials: string;
  onLogout: () => void;
  onLock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition-all duration-150"
        style={{
          background: open ? "var(--bg-elevated)" : "transparent",
          border: "1px solid",
          borderColor: open ? "var(--border)" : "transparent",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "var(--bg-elevated)";
          el.style.borderColor = "var(--border)";
        }}
        onMouseLeave={e => {
          if (!open) {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.borderColor = "transparent";
          }
        }}
      >
        {user?.avatarUrl ? (
          <img src={resolveAssetUrl(user.avatarUrl)!} alt={user.name ?? ""} className="h-8 w-8 rounded-full object-cover ring-2 ring-accent" />
        ) : (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs text-black"
            style={{ background: "#00C4A7" }}
          >
            {initials}
          </div>
        )}
        <span className="text-sm font-semibold hidden sm:block" style={{ color: "var(--text-primary)" }}>
          {user?.name?.split(" ")[0]}
        </span>
        <ChevronDown
          size={14}
          style={{ color: "var(--text-secondary)" }}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 animate-slide-up"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
              Welcome !
            </p>
          </div>

          <div className="px-2.5 pt-2 pb-1">
            {USER_MENU_ITEMS.filter(item => !(item.action === "settings" && (role === "EMPLOYEE" || role === "CLIENT"))).map(({ label, icon: Icon, action, iconBg, iconColor }) => (
              <button
                key={action}
                onClick={() => {
                  setOpen(false);
                  if (action === "lock")          { onLock(); }
                  else if (action === "account")  { router.push(role === "CLIENT" ? "/client-portal/profile" : "/profile"); }
                  else if (action === "settings") { router.push("/settings"); }
                }}
                className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
                  style={{ background: iconBg }}
                >
                  <Icon size={15} style={{ color: iconColor }} />
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="px-2.5 pb-2.5 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(239,68,68,0.15)" }}
              >
                <LogOut size={15} style={{ color: "#f87171" }} />
              </span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [hydrated,             setHydrated]             = useState(false);
  const [mobileOpen,           setMobileOpen]           = useState(false);
  const [navReady,             setNavReady]             = useState(false);
  const [subscriptionBadge,    setSubscriptionBadge]    = useState(0);
  const [changeRequestsBadge,  setChangeRequestsBadge]  = useState(0);
  const [isLocked,             setIsLocked]             = useState(false);
  const [sidebarCollapsed,     setSidebarCollapsed]     = useState(false);
  const [searchOpen,           setSearchOpen]           = useState(false);
  const { count: chatUnreadCount } = useTotalUnread();
  const settings = useSettings();

  useEffect(() => {
    if (sessionStorage.getItem("agency_locked") === "1") setIsLocked(true);
    if (localStorage.getItem("sidebar_collapsed") === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      const t = setTimeout(() => setNavReady(true), 60);
      return () => clearTimeout(t);
    }
  }, [hydrated, isAuthenticated]);
  useEffect(() => {
    function fetchSubBadge() {
      api.get("/subscriptions/analytics/summary")
        .then(r => setSubscriptionBadge(r.data.data?.expiringIn7Days ?? 0))
        .catch(() => {});
    }
    fetchSubBadge();
    const id = setInterval(fetchSubBadge, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const role = user?.role ?? "";
    if (!["SUPER_ADMIN","ADMIN","HR"].includes(role)) return;
    function fetchCRBadge() {
      api.get("/field-permissions/pending-count")
        .then(r => setChangeRequestsBadge(r.data.data?.count ?? 0))
        .catch(() => {});
    }
    fetchCRBadge();
    const id = setInterval(fetchCRBadge, 60_000);
    return () => clearInterval(id);
  }, [user?.role]);
  useEffect(() => { if (hydrated && !isAuthenticated) router.replace("/login"); }, [hydrated, isAuthenticated, router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.map(sec => sec.label))
  );

  useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      NAV_SECTIONS.forEach(sec => {
        if (sec.items.some(item => item.href !== "/" && pathname.startsWith(item.href))) {
          next.add(sec.label);
        }
      });
      return next;
    });
  }, [pathname]);

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  const visibleSections = useMemo(() => {
    const role = user?.role ?? "";
    return NAV_SECTIONS
      .map(sec => ({ ...sec, items: sec.items.filter(item => !item.roles || item.roles.includes(role)) }))
      .filter(sec => sec.items.length > 0);
  }, [user?.role]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#000" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: "rgba(0,196,167,0.3)" }} />
            <div
              className="absolute inset-0 rounded-2xl border-2 border-transparent animate-spin"
              style={{ borderTopColor: "#00C4A7" }}
            />
            <div
              className="absolute inset-1.5 rounded-xl flex items-center justify-center text-black text-sm font-bold"
              style={{ background: "#00C4A7" }}
            >
              A
            </div>
          </div>
          <p className="text-xs animate-pulse" style={{ color: "rgba(0,196,167,0.5)" }}>
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  const pageTitle = Object.entries(PAGE_TITLES)
    .find(([k]) => pathname === k || (k !== "/" && pathname.startsWith(k)))?.[1] ?? "Agency OS";
  const initials  = (user?.name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  function handleLogout()  { logout(); router.push("/login"); }
  function handleLock()    { sessionStorage.setItem("agency_locked", "1"); setIsLocked(true); }
  function toggleSidebar() { setSidebarCollapsed(v => { localStorage.setItem("sidebar_collapsed", !v ? "1" : "0"); return !v; }); }

  const isClient = user?.role === "CLIENT";

  function NavLink({ item, staggerIndex, collapsed = false, isSubItem = false }: { item: NavItem; staggerIndex: number; collapsed?: boolean; isSubItem?: boolean }) {
    const isActive   = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const badgeCount = item.href === "/subscriptions"    ? subscriptionBadge
                     : item.href === "/chat"            ? chatUnreadCount
                     : item.href === "/change-requests" ? changeRequestsBadge
                     : 0;
    return (
      <li
        style={{
          opacity:    navReady ? 1 : 0,
          transform:  navReady ? "translateX(0)" : "translateX(20px)",
          transition: `opacity 0.3s ease ${staggerIndex * 40}ms, transform 0.3s ease ${staggerIndex * 40}ms`,
        }}
      >
        <Link
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={`relative flex items-center rounded-lg font-medium overflow-hidden transition-all duration-150 ${isSubItem ? "h-8 text-[13px]" : "h-9 text-sm"} ${collapsed ? "justify-center px-0" : "gap-[10px] px-2"}`}
          style={isActive
            ? { background: "rgba(0,196,167,0.15)", color: "#00C4A7" }
            : { color: "rgba(255,255,255,0.65)" }
          }
          onMouseEnter={e => {
            if (!isActive) {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.08)";
              el.style.color = "rgba(255,255,255,0.90)";
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = "rgba(255,255,255,0.65)";
            }
          }}
        >
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]"
              style={{ background: "#00C4A7", borderRadius: "0 3px 3px 0" }}
            />
          )}
          <item.icon size={collapsed ? 18 : 15} className="shrink-0" style={{ color: isActive ? "#00C4A7" : "inherit" }} />
          {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && badgeCount > 0 && (
            <span
              className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "#ef4444" }}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          {collapsed && badgeCount > 0 && (
            <span
              className="absolute top-1 right-1 h-[7px] w-[7px] rounded-full"
              style={{ background: "#ef4444" }}
            />
          )}
        </Link>
      </li>
    );
  }

  function buildSidebar(collapsed: boolean) {
    const role = user?.role ?? "";

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div
          className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center px-0" : "gap-3 px-4"}`}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
        >
          {resolveAssetUrl(settings?.sidebar_icon_url ?? settings?.company_logo_url) ? (
            <img src={resolveAssetUrl(settings?.sidebar_icon_url ?? settings?.company_logo_url)!} alt="logo"
              className="h-[30px] w-[30px] shrink-0 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg font-bold text-base text-black"
              style={{ background: "#00C4A7" }}>
              {(settings?.company_name ?? "Agency OS")[0]?.toUpperCase() ?? "A"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-white">{settings?.company_name ?? "Agency OS"}</p>
              <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.6)" }}>
                {settings?.company_tagline ?? "YouTooPreneur"}&#8482;
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-2 scrollbar-thin ${collapsed ? "px-1" : "px-2"}`}>

          {/* ── CLIENT: flat list, no groups ── */}
          {isClient ? (
            <ul className="space-y-0.5">
              {CLIENT_NAV.map((item, i) => (
                <NavLink key={item.href} item={item} staggerIndex={i} collapsed={collapsed} />
              ))}
            </ul>
          ) : (
            <>
              {/* ── Standalone items (Dashboard, Chat) ── */}
              <ul className="space-y-0.5 mb-2">
                {STANDALONE_NAV
                  .filter(item => !item.roles || item.roles.includes(role))
                  .map((item, i) => (
                    <NavLink key={item.href} item={item} staggerIndex={i} collapsed={collapsed} />
                  ))
                }
              </ul>

              {!collapsed && <div className="mb-1 mx-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />}

              <div className="space-y-0.5">
                {visibleSections.map((section, sIdx) => {
                  const isOpen        = openGroups.has(section.label);
                  const isGroupActive = section.items.some(item => item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <div key={section.label}>
                      <button
                        onClick={() => collapsed ? undefined : toggleGroup(section.label)}
                        title={collapsed ? section.label : undefined}
                        className={`flex items-center w-full h-9 rounded-lg transition-all duration-150 ${collapsed ? "justify-center px-0" : "gap-[10px] px-2"}`}
                        style={{
                          opacity:    navReady ? 1 : 0,
                          transform:  navReady ? "translateX(0)" : "translateX(20px)",
                          transition: `opacity 0.3s ease ${(sIdx + STANDALONE_NAV.length) * 40}ms, transform 0.3s ease ${(sIdx + STANDALONE_NAV.length) * 40}ms, background 0.15s, color 0.15s`,
                          color: isGroupActive ? "#00C4A7" : "rgba(255,255,255,0.55)",
                        }}
                        onMouseEnter={e => { if (!isGroupActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; }}
                        onMouseLeave={e => { if (!isGroupActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; }}
                      >
                        <section.icon size={collapsed ? 18 : 15} className="shrink-0" style={{ color: "inherit" }} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium" style={{ color: "inherit" }}>{section.label}</span>
                            {isOpen
                              ? <ChevronDown  size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                              : <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                            }
                          </>
                        )}
                      </button>

                      {!collapsed && isOpen && (
                        <ul className="mt-0.5 mb-1 space-y-0.5 ml-[22px] pl-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                          {section.items.map((item, i) => (
                            <NavLink key={item.href} item={item} staggerIndex={sIdx * 6 + i} collapsed={false} isSubItem />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* ── Collapse toggle ── */}
        <div className={`shrink-0 ${collapsed ? "px-0" : "px-2"} py-2`} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center w-full h-9 rounded-lg transition-colors duration-150 ${collapsed ? "justify-center" : "gap-3 px-2"}`}
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.07)"; el.style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "rgba(255,255,255,0.45)"; }}
          >
            {collapsed ? <PanelLeftOpen size={17} strokeWidth={2} /> : <PanelLeftClose size={17} strokeWidth={2} />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ── Desktop sidebar ── */}
      <div
        className="relative hidden md:block shrink-0 z-40"
        style={{
          width: sidebarCollapsed ? "80px" : "240px",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <aside
          className="flex flex-col overflow-hidden"
          style={{
            ...(sidebarCollapsed ? {
              position:     "absolute",
              top:          "10px",
              bottom:       "10px",
              left:         "10px",
              right:        "10px",
              borderRadius: "999px",
              background:   "var(--bg-sidebar)",
              border:       "1px solid rgba(255,255,255,0.1)",
              boxShadow:    "0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
            } : {
              position:     "absolute",
              inset:        "0",
              background:   "var(--bg-sidebar)",
              borderRight:  "1px solid rgba(255,255,255,0.12)",
              borderRadius: "0",
              boxShadow:    "none",
            }),
            transition: "border-radius 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease",
          }}
        >
          {buildSidebar(sidebarCollapsed)}
        </aside>

      </div>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] md:hidden transition-transform duration-300 ease-in-out"
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.12)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <button
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)" }}
          onClick={() => setMobileOpen(false)}
        >
          <X size={14} />
        </button>
        {buildSidebar(false)}
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header
          className="flex h-16 shrink-0 items-center justify-between z-20 px-8"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg md:hidden transition-all duration-200"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} style={{ color: "var(--text-secondary)" }} />
            </button>

            <h1 className="text-[20px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              title="Search (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 rounded-xl px-3 transition-all duration-200"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            >
              <Search size={15} style={{ color: "var(--text-secondary)" }} />
              <span className="hidden sm:block text-xs" style={{ color: "var(--text-secondary)" }}>Search…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-base)" }}>
                ⌘K
              </kbd>
            </button>

            <ChatBadgeButton count={chatUnreadCount} />
            <NotificationBell />
            <UserMenu user={user} role={user?.role} initials={initials} onLogout={handleLogout} onLock={handleLock} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</main>
      </div>
    </div>

    <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

    {isLocked && (
      <LockScreen
        user={user}
        initials={initials}
        onUnlock={() => setIsLocked(false)}
      />
    )}
    </>
  );
}
