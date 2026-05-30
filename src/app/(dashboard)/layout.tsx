"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

import { timeAgo } from "@/lib/utils";
import api from "@/lib/api";
import type { Notification, TodoGroup, TodoList, NoteTag } from "@/types";
import {
  LayoutDashboard, Building2, Users, CheckSquare, Grid3X3,
  Clock, CalendarDays, Banknote, FileText, BarChart3, ScrollText,
  Shield, UserCircle, Bell, LogOut, Search, Menu, X, Lock,
  CheckCheck, CreditCard, UserPlus,
  Star, UserCheck, AlertCircle, CheckCircle2,
  ChevronDown, ChevronRight, ChevronLeft, ListTodo, Plus,
  Archive, Trash2, Settings, MessageSquare,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useTotalUnread } from "@/hooks/useChat";
import { useSettings } from "@/hooks/useSettings";
import { resolveAssetUrl } from "@/lib/utils";
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
      { label: "Users",  href: "/users",  icon: Shield,  roles: ["SUPER_ADMIN", "ADMIN"] },
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
                      ? { background: "rgba(0,196,167,0.15)", color: "#00C4A7" }
                      : { color: "rgba(255,255,255,0.65)" }
                    }
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; } }}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]" style={{ background: "#00C4A7", borderRadius: "0 3px 3px 0" }} />}
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
                          ? { background: "rgba(0,196,167,0.12)", color: "#00C4A7" }
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
                      ? { background: "rgba(0,196,167,0.12)", color: "#00C4A7" }
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
                      ? { background: "rgba(0,196,167,0.15)", color: "#00C4A7" }
                      : { color: "rgba(255,255,255,0.65)" }
                    }
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.90)"; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; } }}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px]" style={{ background: "#00C4A7", borderRadius: "0 3px 3px 0" }} />}
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
                      ? { background: "rgba(0,196,167,0.12)", color: "#00C4A7" }
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
      {/* Subtle glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #00C4A7 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full opacity-8" style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      </div>

      {/* Clock */}
      <div className="relative text-center mb-10">
        <p className="text-[88px] leading-none font-extralight tracking-tight text-white">
          {timeStr}
        </p>
        <p className="mt-2 text-base font-normal" style={{ color: "rgba(255,255,255,0.5)" }}>
          {dateStr}
        </p>
      </div>

      {/* Lock card */}
      <div className="relative flex flex-col items-center gap-5 w-80">
        {/* Avatar */}
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

        {/* Password form */}
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
  initials,
  onLogout,
  onLock,
}: {
  user: { name?: string; avatarUrl?: string | null } | null;
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
      {/* ── Trigger ── */}
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

      {/* ── Dropdown ── */}
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
          {/* Welcome header */}
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
              Welcome !
            </p>
          </div>

          {/* Menu items */}
          <div className="px-2.5 pt-2 pb-1">
            {USER_MENU_ITEMS.map(({ label, icon: Icon, action, iconBg, iconColor }) => (
              <button
                key={action}
                onClick={() => {
                  setOpen(false);
                  if (action === "lock")     { onLock(); }
                  else if (action === "account")  { router.push("/profile"); }
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

          {/* Logout */}
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

  const [hydrated,          setHydrated]          = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [navReady,          setNavReady]          = useState(false);
  const [subscriptionBadge, setSubscriptionBadge] = useState(0);
  const [isLocked,          setIsLocked]          = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const { count: chatUnreadCount } = useTotalUnread();
  const settings = useSettings();

  // Restore lock + sidebar state on mount
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

  function handleLogout()    { logout(); router.push("/login"); }
  function handleLock()      { sessionStorage.setItem("agency_locked", "1"); setIsLocked(true); }
  function toggleSidebar()   { setSidebarCollapsed(v => { localStorage.setItem("sidebar_collapsed", !v ? "1" : "0"); return !v; }); }

  // ── Nav link component ──────────────────────────────────────────────────────
  function NavLink({ item, staggerIndex, collapsed = false }: { item: NavItem; staggerIndex: number; collapsed?: boolean }) {
    const isActive   = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
          title={collapsed ? item.label : undefined}
          className={`relative flex items-center h-9 rounded-lg text-sm font-medium overflow-hidden transition-all duration-150 ${collapsed ? "justify-center px-0" : "gap-[10px] px-2"}`}
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

  // ── Sidebar content builder ────────────────────────────────────────────────
  function buildSidebar(collapsed: boolean) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div
          className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center px-0" : "gap-3 px-4"}`}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
        >
          {resolveAssetUrl(settings?.company_logo_url) ? (
            <img
              src={resolveAssetUrl(settings!.company_logo_url)!}
              alt="logo"
              className="h-[30px] w-[30px] shrink-0 rounded-lg object-contain bg-white/10"
            />
          ) : (
            <div
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg font-bold text-base text-black"
              style={{ background: "#00C4A7" }}
            >
              {(settings?.company_name ?? "Agency OS")[0]?.toUpperCase() ?? "A"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-white">
                {settings?.company_name ?? "Agency OS"}
              </p>
              <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.6)" }}>
                {settings?.company_tagline ?? "YouTooPreneur"}&#8482;
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-2 scrollbar-thin ${collapsed ? "px-1" : "px-2"}`} style={{ paddingBottom: "4px" }}>
          {navSections.map((section, sIdx) => (
            <div key={section.label}>
              {!collapsed ? (
                <p
                  className="px-3 text-[10px] font-semibold uppercase"
                  style={{ letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", padding: "12px 12px 4px" }}
                >
                  {section.label}
                </p>
              ) : (
                sIdx > 0 && <div className="my-2 mx-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ item, staggerIndex }) => (
                  <NavLink key={item.href} item={item} staggerIndex={staggerIndex} collapsed={collapsed} />
                ))}
              </ul>
              {section.label === "MAIN" && !collapsed && (
                <>
                  <TodoSidebarSection
                    pathname={pathname}
                    navReady={navReady}
                    baseStagger={navSections.slice(0, sIdx + 1).reduce((acc, s) => acc + s.items.length, 0)}
                  />
                  <NotesSidebarSection
                    pathname={pathname}
                    navReady={navReady}
                    baseStagger={navSections.slice(0, sIdx + 1).reduce((acc, s) => acc + s.items.length, 0) + 12}
                  />
                </>
              )}
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle pinned at bottom ── */}
        <div
          className={`shrink-0 ${collapsed ? "px-0" : "px-2"} py-2`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center w-full h-9 rounded-lg transition-colors duration-150 ${collapsed ? "justify-center" : "gap-3 px-2"}`}
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.07)";
              el.style.color      = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color      = "rgba(255,255,255,0.45)";
            }}
          >
            {collapsed
              ? <PanelLeftOpen  size={17} strokeWidth={2} />
              : <PanelLeftClose size={17} strokeWidth={2} />
            }
            {!collapsed && (
              <span className="text-sm font-medium">Collapse</span>
            )}
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
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            >
              <Search size={17} style={{ color: "var(--text-secondary)" }} />
            </button>

            <ChatBadgeButton count={chatUnreadCount} />
            <NotificationBell />
            <UserMenu user={user} initials={initials} onLogout={handleLogout} onLock={handleLock} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</main>
      </div>
    </div>

    {/* Lock screen overlay */}
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
