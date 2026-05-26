"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Subscription } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function urgencyBg(subs: Subscription[]): string {
  if (!subs.length) return "transparent";
  const min = Math.min(...subs.map(s => s.daysLeft));
  if (min < 0)   return "rgba(239,68,68,0.08)";
  if (min <= 7)  return "rgba(249,115,22,0.07)";
  if (min <= 30) return "rgba(245,158,11,0.06)";
  return "transparent";
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

// ─── SubscriptionCalendar ─────────────────────────────────────────────────────

interface Props {
  subs: Subscription[];
  onSelectSub: (uuid: string) => void;
}

export function SubscriptionCalendar({ subs, onSelectSub }: Props) {
  const today = new Date();
  const [year,   setYear]  = useState(today.getFullYear());
  const [month,  setMonth] = useState(today.getMonth()); // 0-based
  const [popDay, setPopDay] = useState<string | null>(null);

  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`;

  function prev() {
    setPopDay(null);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    setPopDay(null);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Group subs by end date YYYY-MM-DD
  const byDate = new Map<string, Subscription[]>();
  for (const s of subs) {
    const d = s.endDate?.slice(0, 10);
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(s);
  }

  // Build cell array
  const firstDay      = new Date(year, month, 1).getDay();          // 0=Sun
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const totalCells    = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  type Cell = { day: number; dateStr: string; current: boolean };
  const cells: Cell[] = [];

  // Leading (prev month)
  const pm = month === 0 ? 11 : month - 1;
  const py = month === 0 ? year - 1 : year;
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({ day: d, dateStr: `${py}-${pad2(pm+1)}-${pad2(d)}`, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${year}-${pad2(month+1)}-${pad2(d)}`, current: true });
  }
  // Trailing (next month)
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  let trailing = 1;
  while (cells.length < totalCells) {
    cells.push({ day: trailing, dateStr: `${ny}-${pad2(nm+1)}-${pad2(trailing)}`, current: false });
    trailing++;
  }

  const popSubs = popDay ? (byDate.get(popDay) ?? []) : [];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>

      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={prev}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {MONTHS[month]} {year}
        </p>
        <button
          onClick={next}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const daySubs  = byDate.get(cell.dateStr) ?? [];
          const isToday  = cell.dateStr === todayStr;
          const isPopped = popDay === cell.dateStr;
          const hasSubs  = daySubs.length > 0 && cell.current;
          const bg       = cell.current ? urgencyBg(daySubs) : "transparent";
          const col      = cells.length;

          return (
            <div
              key={i}
              onClick={() => hasSubs && setPopDay(isPopped ? null : cell.dateStr)}
              className="flex flex-col p-1.5 transition-colors"
              style={{
                minHeight: "68px",
                borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                borderBottom: i < col - 7 ? "1px solid var(--border)" : "none",
                background: isPopped ? "var(--bg-elevated)" : bg,
                cursor: hasSubs ? "pointer" : "default",
                opacity: cell.current ? 1 : 0.35,
              }}
            >
              {/* Day number */}
              <span
                className="self-end flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style={isToday && cell.current ? {
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: 700,
                } : {
                  color: "var(--text-primary)",
                  fontWeight: 400,
                }}
              >
                {cell.day}
              </span>

              {/* Status dots */}
              {hasSubs && (
                <div className="flex flex-wrap items-center gap-0.5 mt-auto">
                  {daySubs.slice(0, 3).map(s => (
                    <span
                      key={s.uuid}
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: s.status?.color ?? "#6366F1" }}
                      title={s.name}
                    />
                  ))}
                  {daySubs.length > 3 && (
                    <span className="text-[10px] leading-none" style={{ color: "var(--text-secondary)" }}>
                      +{daySubs.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day popover (inline, below grid) */}
      {popDay && popSubs.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {new Date(popDay + "T00:00:00").toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            <button onClick={() => setPopDay(null)} className="transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
              <X size={13} />
            </button>
          </div>
          <ul className="px-4 pb-3 space-y-1">
            {popSubs.map(sub => (
              <li key={sub.uuid}>
                <button
                  onClick={() => { onSelectSub(sub.uuid); setPopDay(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                  style={{ background: "var(--bg-surface)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                >
                  {sub.logoUrl ? (
                    <img
                      src={sub.logoUrl}
                      alt={sub.name}
                      className="h-6 w-6 rounded-full object-cover shrink-0"
                      style={{ border: "1px solid var(--border)" }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: sub.category?.color ?? "#6366F1" }}
                    >
                      {sub.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {sub.name}
                  </span>
                  {sub.status && (
                    <span
                      className="shrink-0 text-xs rounded-full px-2 py-0.5 font-medium"
                      style={{ background: `${sub.status.color}18`, color: sub.status.color }}
                    >
                      {sub.status.label}
                    </span>
                  )}
                  {sub.price != null && (
                    <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {sub.currency === "INR" ? "₹" : sub.currency}{sub.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
