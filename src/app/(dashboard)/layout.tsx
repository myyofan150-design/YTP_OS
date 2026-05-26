"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { timeAgo } from "@/lib/utils";
import api from "@/lib/api";
import type { Notification, TodoGroup, TodoList, NoteTag } from "@/types";
import {
  LayoutDashboard, Building2, Users, CheckSquare, Grid3X3,
  Clock, CalendarDays, Banknote, FileText, BarChart3, ScrollText,
  Shield, UserCircle, Bell, LogOut, Search, Sun, Moon, Menu, X,
  CheckCheck, CreditCard, UserPlus,
  Star, UserCheck, AlertCircle, CheckCircle2,
  ChevronDown, ChevronRight, ListTodo, Plus,
  Archive, Trash2, Settings, MessageSquare,
} from "lucide-react";
import { useTotalUnread } from "@/hooks/useChat";
import { NewListDialog }  from "@/components/modules/todo/NewListDialog";
import { NewGroupDialog } from "@/components/modules/todo/NewGroupDialog";

// ─── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem { label: string; href: string; icon: React.ElementType; roles?: string[]; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard",  href: "/",           icon: LayoutDashboard },
      { label: "Chat",       href: "/chat",       icon: MessageSquare },
      { label: "Leads",      href: "/leads",      icon: UserPlus },
      { label: "Clients",    href: "/clients",    icon: Building2 },
      { label: "Employees",  href: "/employees",   icon: Users },
      { label: "Tasks",      href: "/tasks",       icon: CheckSquare },
      { label: "Workspace",  href: "/workspace",   icon: Grid3X3 },
    ],
  },
  {
    label: "HR",
    items: [
      { label: "Attendance", href: "/attendance",  icon: Clock },
      { label: "Leave",      href: "/leave",       icon: CalendarDays },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "Payroll",        href: "/payroll",        icon: Banknote },
      { label: "Invoices",       href: "/invoices",       icon: FileText },
      { label: "Subscriptions",  href: "/subscriptions",  icon: CreditCard },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { label: "Reports",       href: "/reports",       icon: BarChart3 },
      { label: "Activity Logs", href: "/activity-logs", icon: ScrollText, roles: ["SUPER_ADMIN", "ADMIN"] },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Users",     href: "/users",     icon: Shield,      roles: ["SUPER_ADMIN", "ADMIN"] },
      { label: "Settings",  href: "/settings",  icon: Settings,    roles: ["SUPER_ADMIN"] },
      { label: "Profile",   href: "/profile",   icon: UserCircle },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/":              "Dashboard",
  "/leads":         "Leads",
  "/clients":       "Clients",
  "/employees":     "Employees",
  "/tasks":         "Tasks",
  "/attendance":    "Attendance",
  "/leave":         "Leave Management",
  "/payroll":       "Payroll",
  "/invoices":       "Invoices",
  "/subscriptions":  "Subscription Tracker",
  "/workspace":      "Workspace",
  "/reports":       "Reports",
  "/users":         "User Management",
  "/profile":       "My Profile",
  "/notifications": "Notifications",
  "/activity-logs": "Activity Logs",
  "/settings":      "Settings",
  "/todo":          "To Do",
  "/notes":         "Notes",
  "/chat":          "Chat",
};

// ─── Todo Sidebar Section ─────────────────────────────────────────────────────

const SMART_VIEW_ITEMS = [
  { view: "today",          label: "Today",          Icon: CalendarDays },
  { view: "important",      label: "Important",      Icon: Star },
  { view: "assigned-to-me", label: "Assigned to Me", Icon: UserCheck },
  { view: "overdue",        label: "Overdue",        Icon: AlertCircle },
  { view: "completed",      label: "Completed",      Icon: CheckCircle2 },
] as const;


function TodoSidebarSection({
  pathname,
  navReady,
  baseStagger,
}: {
  pathname: string;
  navReady: boolean;
  baseStagger: number;
}) {
  const [collapsed, setCollapsed]     = useState(true);
  const [groups, setGroups]           = useState<TodoGroup[]>([]);
  const [lists, setLists]             = useState<TodoList[]>([]);
  const [openGroups, setOpenGroups]   = useState<Set<number>>(new Set());
  const [newListOpen, setNewListOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const router = useRouter();

  function fetchData() {
    api.get("/todo/groups").then(r => setGroups(r.data.data ?? [])).catch(() => {});
    api.get("/todo/lists").then(r  => setLists(r.data.data ?? [])).catch(() => {});
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(id: number) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const isTodoActive   = pathname.startsWith("/todo");
  let   idx            = baseStagger;
  const ungroupedLists = lists.filter(l => !l.groupId);

  // Resolve active view from URL (client-only)
  const activeView = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("view")
    : null;
  const activeListUuid = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("listUuid")
    : null;

  return (
    <>
      <div>
        {/* Section header row */}
        <div
          className="flex items-center px-3 py-1"
          style={{
            opacity:    navReady ? 1 : 0,
            transform:  navReady ? "translateX(0)" : "translateX(20px)",
            transition: `opacity 0.3s ease ${idx * 40}ms, transform 0.3s ease ${idx * 40}ms`,
          }}
        >
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-1 flex-1 min-w-0"
          >
            <p
              className="text-[10px] font-semibold uppercase"
              style={{ letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", padding: "8px 0 4px" }}
            >
              TO DO
            </p>
            {collapsed
              ? <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
              : <ChevronDown  size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
            }
          </button>
          {/* New Group button */}
          <button
            onClick={e => { e.stopPropagation(); setNewGroupOpen(true); }}
            title="New Group"
            className="flex h-5 w-5 items-center justify-center rounded opacity-0 hover:opacity-100 transition-opacity ml-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
          >
            <Plus size={10} />
          </button>
        </div>

        {!collapsed && (
          <ul className="space-y-0.5">
            {/* Smart views */}
            {SMART_VIEW_ITEMS.map(({ view, label, Icon }) => {
              const href     = `/todo?view=${view}`;
              const isActive = isTodoActive && activeView === view;
              return (
                <li
                  key={view}
                  style={{
                    opacity:    navReady ? 1 : 0,
                    transform:  navReady ? "translateX(0)" : "translateX(20px)",
                    transition: `opacity 0.3s ease ${(++idx) * 40}ms, transform 0.3s ease ${idx * 40}ms`,
                  }}
                >
                  <Link
                    href={href}
                    className="relative flex items-center gap-[10px] h-9 px-2 rounded-lg text-sm font-medium overflow-hidden transition-all duration-150"
                    style={isActive
                      ? { background: "rgba(3,255,148,0.15)", color: "#03ff94" }
                      : { color: "rgba(255,255,255,0.65)" }
                    }
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; } }}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]" style={{ background: "#03ff94", borderRadius: "0 3px 3px 0" }} />}
                    <Icon size={14} className="shrink-0" style={{ color: "inherit" }} />
                    <span className="flex-1">{label}</span>
                  </Link>
                </li>
              );
            })}

            {/* Groups + their lists */}
            {groups.map(group => {
              const groupLists = lists.filter(l => l.groupId === group.id);
              const isOpen     = openGroups.has(group.id);
              return (
                <li key={group.uuid}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 h-8 px-2 rounded-lg text-xs transition-all duration-150"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.80)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: group.color ?? "#6366F1" }} />
                    <span className="flex-1 text-left truncate font-medium">{group.name}</span>
                    {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  </button>

                  {isOpen && groupLists.map(list => {
                    const listActive = isTodoActive && activeListUuid === list.uuid;
                    return (
                      <Link
                        key={list.uuid}
                        href={`/todo?listUuid=${list.uuid}`}
                        className="flex items-center gap-2 h-8 pl-6 pr-2 rounded-lg text-xs transition-all duration-150"
                        style={listActive
                          ? { background: "rgba(3,255,148,0.12)", color: "#03ff94" }
                          : { color: "rgba(255,255,255,0.55)" }
                        }
                        onMouseEnter={e => { if (!listActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; } }}
                        onMouseLeave={e => { if (!listActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: list.color ?? "#6366F1" }} />
                        <span className="flex-1 truncate">{list.name}</span>
                        {(list.taskCount ?? 0) > 0 && (
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{list.taskCount}</span>
                        )}
                      </Link>
                    );
                  })}
                </li>
              );
            })}

            {/* Ungrouped lists */}
            {ungroupedLists.map(list => {
              const listActive = isTodoActive && activeListUuid === list.uuid;
              return (
                <li key={list.uuid}>
                  <Link
                    href={`/todo?listUuid=${list.uuid}`}
                    className="flex items-center gap-2 h-8 px-2 rounded-lg text-xs transition-all duration-150"
                    style={listActive
                      ? { background: "rgba(3,255,148,0.12)", color: "#03ff94" }
                      : { color: "rgba(255,255,255,0.55)" }
                    }
                    onMouseEnter={e => { if (!listActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; } }}
                    onMouseLeave={e => { if (!listActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
                  >
                    <ListTodo size={12} className="shrink-0" style={{ color: list.color ?? "#6366F1" }} />
                    <span className="flex-1 truncate">{list.name}</span>
                    {(list.taskCount ?? 0) > 0 && (
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{list.taskCount}</span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* + New List */}
            <li>
              <button
                onClick={() => setNewListOpen(true)}
                className="flex items-center gap-2 h-8 w-full px-2 rounded-lg text-xs transition-all duration-150"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
              >
                <Plus size={12} />
                <span>New List</span>
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Dialogs rendered here so they have the right z-context */}
      <NewListDialog
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        onCreated={list => { fetchData(); router.push(`/todo?listUuid=${list.uuid}`); }}
      />
      <NewGroupDialog
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={() => fetchData()}
      />
    </>
  );
}

// ─── Notes Sidebar Section ────────────────────────────────────────────────────

const NOTES_SMART_VIEWS = [
  { filter: null,       label: "All Notes",      Icon: FileText  },
  { filter: "starred",  label: "Starred",        Icon: Star      },
  { filter: "assigned", label: "Assigned to Me", Icon: UserCheck },
  { filter: "archived", label: "Archived",       Icon: Archive   },
  { filter: "deleted",  label: "Deleted",        Icon: Trash2    },
] as const;

function NotesSidebarSection({
  pathname,
  navReady,
  baseStagger,
}: {
  pathname: string;
  navReady: boolean;
  baseStagger: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [tags, setTags]           = useState<NoteTag[]>([]);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  useEffect(() => {
    api.get("/notes/tags").then(r => setTags(r.data.data ?? [])).catch(() => {});
  }, []);

  const isNotesActive = pathname.startsWith("/notes");
  let idx = baseStagger;

  const activeFilter = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("filter")
    : null;
  const activeTagId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("tagId")
    : null;

  return (
    <>
      <div>
        <div
          className="flex items-center px-3 py-1"
          style={{
            opacity:    navReady ? 1 : 0,
            transform:  navReady ? "translateX(0)" : "translateX(20px)",
            transition: `opacity 0.3s ease ${idx * 40}ms, transform 0.3s ease ${idx * 40}ms`,
          }}
        >
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-1 flex-1 min-w-0"
          >
            <p
              className="text-[10px] font-semibold uppercase"
              style={{ letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", padding: "8px 0 4px" }}
            >
              NOTES
            </p>
            {collapsed
              ? <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
              : <ChevronDown  size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
            }
          </button>
          <button
            onClick={e => { e.stopPropagation(); setTagManagerOpen(true); }}
            title="Manage Tags"
            className="flex h-5 w-5 items-center justify-center rounded transition-opacity"
            style={{ color: "rgba(255,255,255,0.4)", opacity: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
          >
            <Settings size={10} />
          </button>
        </div>

        {!collapsed && (
          <ul className="space-y-0.5">
            {/* Smart views */}
            {NOTES_SMART_VIEWS.map(({ filter, label, Icon }) => {
              const href = filter ? `/notes?filter=${filter}` : "/notes";
              const isActive = isNotesActive && activeFilter === filter && (filter !== null || (!activeFilter && !activeTagId && pathname === "/notes"));
              return (
                <li
                  key={label}
                  style={{
                    opacity:    navReady ? 1 : 0,
                    transform:  navReady ? "translateX(0)" : "translateX(20px)",
                    transition: `opacity 0.3s ease ${(++idx) * 40}ms, transform 0.3s ease ${idx * 40}ms`,
                  }}
                >
                  <Link
                    href={href}
                    className="relative flex items-center gap-[10px] h-9 px-2 rounded-lg text-sm font-medium overflow-hidden transition-all duration-150"
                    style={isActive
                      ? { background: "rgba(3,255,148,0.15)", color: "#03ff94" }
                      : { color: "rgba(255,255,255,0.65)" }
                    }
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; } }}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]" style={{ background: "#03ff94", borderRadius: "0 3px 3px 0" }} />}
                    <Icon size={14} className="shrink-0" style={{ color: "inherit" }} />
                    <span className="flex-1">{label}</span>
                  </Link>
                </li>
              );
            })}

            {/* Tags */}
            {tags.map(tag => {
              const isActive = isNotesActive && activeTagId === tag.uuid;
              return (
                <li key={tag.uuid}>
                  <Link
                    href={`/notes?tagId=${tag.uuid}`}
                    className="flex items-center gap-2 h-8 px-2 rounded-lg text-xs transition-all duration-150"
                    style={isActive
                      ? { background: "rgba(3,255,148,0.12)", color: "#03ff94" }
                      : { color: "rgba(255,255,255,0.55)" }
                    }
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tag.color }} />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {(tag.noteCount ?? 0) > 0 && (
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{tag.noteCount}</span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* + New Note */}
            <li>
              <Link
                href="/notes?new=1"
                className="flex items-center gap-2 h-8 w-full px-2 rounded-lg text-xs transition-all duration-150"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
              >
                <Plus size={12} />
                <span>New Note</span>
              </Link>
            </li>
          </ul>
        )}
      </div>

      {tagManagerOpen && (
        <NoteTagManagerDialog
          open={tagManagerOpen}
          onClose={() => { setTagManagerOpen(false); api.get("/notes/tags").then(r => setTags(r.data.data ?? [])).catch(() => {}); }}
        />
      )}
    </>
  );
}

// Lazy-load TagManagerDialog to avoid circular deps
function NoteTagManagerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [TagManagerDialog, setComp] = useState<React.ComponentType<{ open: boolean; onClose: () => void }> | null>(null);
  useEffect(() => {
    import("@/components/modules/notes/TagManagerDialog").then(m => setComp(() => m.TagManagerDialog));
  }, []);
  if (!TagManagerDialog) return null;
  return <TagManagerDialog open={open} onClose={onClose} />;
}

function notifIcon(type: string) {
  const map: Record<string, string> = {
    LEAVE_REQUEST: "🏖️", TASK_DUE: "✅", RENEWAL: "🔄",
    INVOICE_DUE: "💳", PAYROLL: "💰", GENERAL: "📢",
  };
  return map[type] ?? "🔔";
}

// ─── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[34px] w-[34px]" />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle theme"
      className="flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-200"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      {theme === "dark"
        ? <Sun  size={16} style={{ color: "var(--text-secondary)" }} />
        : <Moon size={16} style={{ color: "var(--text-secondary)" }} />
      }
    </button>
  );
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
        className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-200"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      >
        <Bell size={16} style={{ color: "var(--text-secondary)" }} />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse-dot"
            style={{ background: "var(--danger)" }}
          />
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
          {/* Dropdown header */}
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

          {/* Items */}
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

          {/* Footer */}
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

// ─── Dashboard Layout ─────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [hydrated,          setHydrated]          = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [navReady,          setNavReady]          = useState(false);
  const [subscriptionBadge, setSubscriptionBadge] = useState(0);
  const { count: chatUnreadCount } = useTotalUnread();

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
  useEffect(() => { if (hydrated && !isAuthenticated) router.replace("/login"); }, [hydrated, isAuthenticated, router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Pre-compute nav sections with stagger indices
  const navSections = useMemo(() => {
    const role = user?.role ?? "";
    let idx = 0;
    return NAV_GROUPS
      .map(g => ({
        label: g.label,
        items: g.items
          .filter(item => !item.roles || item.roles.includes(role))
          .map(item => ({ item, staggerIndex: idx++ })),
      }))
      .filter(g => g.items.length > 0);
  }, [user?.role]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#000" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: "rgba(0,115,89,0.3)" }} />
            <div
              className="absolute inset-0 rounded-2xl border-2 border-transparent animate-spin"
              style={{ borderTopColor: "#03ff94" }}
            />
            <div
              className="absolute inset-1.5 rounded-xl flex items-center justify-center text-black text-sm font-bold"
              style={{ background: "#03ff94" }}
            >
              A
            </div>
          </div>
          <p className="text-xs animate-pulse" style={{ color: "rgba(3,255,148,0.5)" }}>
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  const pageTitle = Object.entries(PAGE_TITLES)
    .find(([k]) => pathname === k || (k !== "/" && pathname.startsWith(k)))?.[1] ?? "Agency OS";
  const initials  = (user?.name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  function handleLogout() { logout(); router.push("/login"); }

  // ── Nav link component ──────────────────────────────────────────────────────
  function NavLink({ item, staggerIndex }: { item: NavItem; staggerIndex: number }) {
    const isActive  = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const badgeCount = item.href === "/subscriptions" ? subscriptionBadge
                     : item.href === "/chat"          ? chatUnreadCount
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
          className="relative flex items-center gap-[10px] h-9 px-2 rounded-lg text-sm font-medium overflow-hidden transition-all duration-150"
          style={isActive
            ? { background: "rgba(3,255,148,0.15)", color: "#03ff94" }
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
              style={{ background: "#03ff94", borderRadius: "0 3px 3px 0" }}
            />
          )}
          <item.icon size={15} className="shrink-0" style={{ color: isActive ? "#03ff94" : "inherit" }} />
          <span className="flex-1">{item.label}</span>
          {badgeCount > 0 && (
            <span
              className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "#ef4444" }}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Link>
      </li>
    );
  }

  // ── Sidebar content (shared between desktop + mobile) ──────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-3 h-16 px-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg font-bold text-base text-black"
          style={{ background: "#03ff94" }}
        >
          A
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-white">Agency OS</p>
          <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.6)" }}>
            YouTooPreneur
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {navSections.map((section, sIdx) => (
          <div key={section.label}>
            <p
              className="px-3 text-[10px] font-semibold uppercase"
              style={{
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.4)",
                padding: "12px 12px 4px",
              }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ item, staggerIndex }) => (
                <NavLink key={item.href} item={item} staggerIndex={staggerIndex} />
              ))}
            </ul>
            {section.label === "MAIN" && (
              <>
                <TodoSidebarSection
                  pathname={pathname}
                  navReady={navReady}
                  baseStagger={navSections
                    .slice(0, sIdx + 1)
                    .reduce((acc, s) => acc + s.items.length, 0)}
                />
                <NotesSidebarSection
                  pathname={pathname}
                  navReady={navReady}
                  baseStagger={navSections
                    .slice(0, sIdx + 1)
                    .reduce((acc, s) => acc + s.items.length, 0) + 12}
                />
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div
        className="shrink-0 p-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
      >
        {/* User row */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs text-black"
            style={{ background: "#03ff94" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] truncate leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg h-8 text-[13px] text-white transition-all duration-150"
          style={{ background: "rgba(255,255,255,0.08)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-[240px] shrink-0 z-40"
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {sidebarContent}
      </aside>

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
        {sidebarContent}
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
            {/* Mobile hamburger */}
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
            {/* Search */}
            <button
              title="Search"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-200"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <Search size={16} style={{ color: "var(--text-secondary)" }} />
            </button>

            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
