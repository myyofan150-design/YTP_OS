"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2, Circle, Star, MoreHorizontal,
  Trash2, Bell, Flag, Calendar, Plus, Paperclip, Clock, Copy, AlarmClock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveAssetUrl } from "@/lib/utils";
import { showUndoToast } from "./UndoToast";
import type { TodoTask } from "@/types";

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#f97316", "#14b8a6", "#a855f7",
  "#3b82f6", "#ec4899", "#f59e0b",
  "#06b6d4", "#f43f5e",
];

function nameColor(name: string) {
  return AVATAR_PALETTE[
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length
  ];
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Priority config ────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<string, { accent: string; glow: string; chip: string; label: string }> = {
  high:   { accent: "#ef4444", glow: "rgba(239,68,68,0.18)",   chip: "bg-red-500/10 text-red-400 border-red-500/20",   label: "High"   },
  medium: { accent: "#3b82f6", glow: "rgba(59,130,246,0.15)",  chip: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Medium" },
  low:    { accent: "#22c55e", glow: "rgba(34,197,94,0.15)",   chip: "bg-green-500/10 text-green-400 border-green-500/20", label: "Low" },
  none:   { accent: "transparent", glow: "transparent",        chip: "", label: "" },
};

// ── Date helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function dueMeta(iso: string): { color: string; bg: string; isOverdue: boolean } {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)  return { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  isOverdue: true  };
  if (diff <= 2) return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", isOverdue: false };
  return { color: "var(--muted-foreground)", bg: "rgba(255,255,255,0.04)", isOverdue: false };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  task:          TodoTask;
  onUpdate:      () => void;
  onOpen:        () => void;
  isDragging?:   boolean;
  showListName?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TaskCard({ task, onUpdate, onOpen, isDragging, showListName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const done         = task.status === "completed";
  const subtaskCount = task.subtaskCount   ?? 0;
  const attachCount  = task.attachmentCount ?? 0;
  const members      = task.members ?? [];
  const cfg          = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG["none"];

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.patch(`/todo/tasks/${task.uuid}/status`);
      onUpdate();
      window.dispatchEvent(new CustomEvent("todo-task-mutated"));
      if (!done) {
        showUndoToast({
          message:  "Task completed",
          duration: 8000,
          onUndo:   async () => {
            await api.patch(`/todo/tasks/${task.uuid}/status`);
            onUpdate();
            window.dispatchEvent(new CustomEvent("todo-task-mutated"));
          },
        });
      }
    } catch { toast.error("Failed to update status"); }
  }

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.patch(`/todo/tasks/${task.uuid}/favorite`);
      onUpdate();
      window.dispatchEvent(new CustomEvent("todo-task-mutated"));
    }
    catch { toast.error("Failed to update favourite"); }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    if (!task.listUuid) { toast.error("Cannot duplicate: list not found"); return; }
    try {
      await api.post(`/todo/lists/${task.listUuid}/tasks`, {
        title:       `Copy of ${task.title}`,
        description: task.description ?? null,
        priority:    task.priority,
        dueDate:     task.dueDate ?? null,
        bgColor:     task.bgColor ?? "default",
      });
      toast.success("Task duplicated");
      onUpdate();
    } catch { toast.error("Failed to duplicate task"); }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await api.delete(`/todo/tasks/${task.uuid}`);
      toast.success("Task deleted");
      onUpdate();
      window.dispatchEvent(new CustomEvent("todo-task-mutated"));
    }
    catch { toast.error("Failed to delete task"); }
  }

  const dm = task.dueDate ? dueMeta(task.dueDate) : null;

  return (
    <div
      onClick={onOpen}
      className={`relative group cursor-pointer select-none rounded-2xl border transition-all duration-200
        ${isDragging
          ? "shadow-2xl shadow-black/30 scale-[1.03] rotate-[1deg] border-primary/40"
          : "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10"
        }
        ${done ? "opacity-55" : ""}`}
      style={{
        background:   isDragging
          ? "var(--card)"
          : "var(--card)",
        borderColor:  isDragging ? "var(--primary)" : "var(--border)",
        borderLeftWidth: "3px",
        borderLeftColor: done ? "var(--border)" : cfg.accent,
        boxShadow: isDragging
          ? `0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px ${cfg.accent}40`
          : `0 1px 3px rgba(0,0,0,0.08), 0 0 0 0px transparent`,
      }}
    >
      {/* Priority glow strip */}
      {!done && cfg.accent !== "transparent" && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 20px ${cfg.glow}` }}
        />
      )}

      {/* Top row: checkbox + title + actions */}
      <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
        <button
          onClick={handleToggle}
          className="shrink-0 mt-0.5 transition-all duration-150 hover:scale-110"
        >
          {done
            ? <CheckCircle2 size={17} className="text-emerald-500 drop-shadow-sm" />
            : <Circle       size={17} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug line-clamp-2 tracking-[-0.01em]
            ${done ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
            {task.title}
          </p>
          {task.description && !done && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
          <button
            onClick={e => { e.stopPropagation(); handleFavorite(e); }}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-muted/60
              ${task.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <Star
              size={12}
              className={task.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"}
            />
          </button>

          <div className="relative">
            <button
              ref={btnRef}
              onClick={e => {
                e.stopPropagation();
                if (btnRef.current) {
                  const r = btnRef.current.getBoundingClientRect();
                  setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
                }
                setMenuOpen(v => !v);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-muted/60 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={13} className="text-muted-foreground" />
            </button>

            {menuOpen && typeof document !== "undefined" && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
                <div
                  className="fixed z-[9999] min-w-[170px] rounded-xl border border-border bg-card shadow-2xl shadow-black/20 py-1.5 backdrop-blur-sm"
                  style={{ top: menuPos.top, right: menuPos.right }}
                >
                  <CtxBtn icon={<Flag     size={12} />} label="Set Priority"  onClick={e => { e.stopPropagation(); setMenuOpen(false); onOpen(); }} />
                  <CtxBtn icon={<Calendar size={12} />} label="Set Due Date"  onClick={e => { e.stopPropagation(); setMenuOpen(false); onOpen(); }} />
                  <CtxBtn icon={<Bell     size={12} />} label="Set Reminder"  onClick={e => { e.stopPropagation(); setMenuOpen(false); onOpen(); }} />
                  <CtxBtn icon={<Copy     size={12} />} label="Duplicate"     onClick={handleDuplicate} />
                  <div className="my-1.5 mx-3 border-t border-border/60" />
                  <CtxBtn icon={<Trash2   size={12} />} label="Delete Task"   onClick={handleDelete} danger />
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Meta row: list · priority · date · subtasks · attachments · avatars */}
      {(showListName && task.listName) || (showListName && task.priority !== "none" && !done) || members.length > 0 || task.dueDate || subtaskCount > 0 || attachCount > 0 ? (
        <div className="flex items-center gap-2 px-3.5 pb-3 pt-1 flex-wrap">
          {showListName && task.listName && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${task.listColor ?? "#6366F1"}18`, color: task.listColor ?? "#6366F1" }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: task.listColor ?? "#6366F1" }} />
              {task.listName}
            </span>
          )}

          {showListName && task.priority !== "none" && !done && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${cfg.chip}`}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.accent }} />
              {cfg.label}
            </span>
          )}

          {task.dueDate && dm && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: dm.bg, color: dm.color }}
            >
              {dm.isOverdue ? <AlarmClock size={9} className="shrink-0" /> : <Clock size={9} className="shrink-0" />}
              {fmtDate(task.dueDate)}
            </span>
          )}

          {subtaskCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
              <CheckCircle2 size={9} className="shrink-0" />
              {subtaskCount}
            </span>
          )}

          {attachCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground">
              <Paperclip size={9} className="shrink-0" />
              {attachCount}
            </span>
          )}

          {members.length > 0 && (
            <>
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map(m => {
                  const photoSrc = resolveAssetUrl(m.avatarUrl);
                  return photoSrc
                    ? <img
                        key={m.id} src={photoSrc} alt={m.name} title={m.name}
                        className="w-5 h-5 rounded-full ring-[2px] ring-card object-cover"
                      />
                    : <span
                        key={m.id} title={m.name}
                        className="w-5 h-5 rounded-full ring-[2px] ring-card flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ background: nameColor(m.name) }}
                      >
                        {initials(m.name)}
                      </span>;
                })}
              </div>
              {members.length > 4 && (
                <span className="text-[10px] text-muted-foreground font-medium">+{members.length - 4}</span>
              )}
              <button
                onClick={e => { e.stopPropagation(); onOpen(); }}
                className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center
                  opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all hover:border-primary/60 hover:bg-primary/5"
              >
                <Plus size={9} className="text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Context menu button ────────────────────────────────────────────────────────

function CtxBtn({
  icon, label, onClick, danger,
}: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left
        ${danger
          ? "text-red-400 hover:bg-red-500/8"
          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"}`}
    >
      {icon}{label}
    </button>
  );
}
