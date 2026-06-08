"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import api from "@/lib/api";
import {
  Search, X, Building2, CheckSquare, FileText, Users, UserPlus, Loader2, ListTodo,
} from "lucide-react";

interface SearchResult {
  uuid: string;
  title: string;
  subtitle: string;
  extra?: string;
}

interface SearchData {
  clients:   SearchResult[];
  tasks:     SearchResult[];
  todos:     SearchResult[];
  invoices:  SearchResult[];
  employees: SearchResult[];
  leads:     SearchResult[];
}

const SECTIONS: { key: keyof SearchData; label: string; icon: React.ElementType; href: (r: SearchResult) => string }[] = [
  { key: "clients",   label: "Clients",   icon: Building2,    href: r => `/clients/${r.uuid}`   },
  { key: "tasks",     label: "Tasks",     icon: CheckSquare,  href: r => `/tasks?open=${r.uuid}` },
  { key: "todos",     label: "Todo",      icon: ListTodo,     href: r => `/todo?listUuid=${r.extra ?? r.uuid}` },
  { key: "invoices",  label: "Invoices",  icon: FileText,     href: r => `/invoices?open=${r.uuid}` },
  { key: "employees", label: "Employees", icon: Users,        href: r => `/employees/${r.uuid}`  },
  { key: "leads",     label: "Leads",     icon: UserPlus,     href: r => `/leads?open=${r.uuid}` },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: Props) {
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(0);

  // Flatten results for keyboard navigation
  const flatItems = results
    ? SECTIONS.flatMap(s =>
        (results[s.key] ?? []).map(r => ({ ...r, href: s.href(r) }))
      )
    : [];

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const r = await api.get("/search", { params: { q } });
      setResults(r.data.data);
      setActive(0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); open ? onClose() : undefined; }
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(v => Math.min(v + 1, flatItems.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
      if (e.key === "Enter" && flatItems[active]) {
        router.push(flatItems[active].href);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, flatItems, active, router]);

  if (!open) return null;

  const hasResults = results && SECTIONS.some(s => (results[s.key] ?? []).length > 0);

  function navigate(href: string) { router.push(href); onClose(); }

  let globalIdx = 0;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-[15%] z-[9001] w-full max-w-xl -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "var(--accent)" }} />
            : <Search size={18} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, tasks, todos, invoices, employees…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ color: "var(--text-primary)" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults(null); inputRef.current?.focus(); }}>
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-elevated)" }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {!query && (
            <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Type to search across clients, tasks, todos, invoices, employees and leads
            </p>
          )}

          {query.length === 1 && (
            <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Keep typing…
            </p>
          )}

          {query.length >= 2 && !loading && !hasResults && (
            <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              No results for <span className="font-semibold" style={{ color: "var(--text-primary)" }}>"{query}"</span>
            </p>
          )}

          {hasResults && SECTIONS.map(section => {
            const items = results?.[section.key] ?? [];
            if (items.length === 0) return null;
            const Icon = section.icon;
            return (
              <div key={section.key}>
                {/* Section header */}
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
                >
                  <Icon size={12} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    {section.label}
                  </span>
                </div>

                {items.map(item => {
                  const idx      = globalIdx++;
                  const isActive = idx === active;
                  const href     = section.href(item);
                  return (
                    <button
                      key={item.uuid}
                      onClick={() => navigate(href)}
                      onMouseEnter={() => setActive(idx)}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors"
                      style={{
                        background: isActive ? "var(--bg-elevated)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: isActive ? "rgba(0,196,167,0.15)" : "var(--bg-elevated)" }}
                      >
                        <Icon size={13} style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <kbd
                          className="shrink-0 rounded border px-1.5 py-0.5 text-[10px]"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-base)" }}
                        >
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}
        >
          {[["↑↓", "navigate"], ["↵", "open"], ["Esc", "close"]].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <kbd
                className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-base)" }}
              >
                {key}
              </kbd>
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
            </span>
          ))}
          <span className="ml-auto text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
            Global Search
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}
