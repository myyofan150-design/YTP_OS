"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Star, Paperclip, X, Tag, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotes, useNoteTags, useNoteSearch } from "@/hooks/useNotes";
import { NoteCard } from "./NoteCard";
import { TagManagerDialog } from "./TagManagerDialog";
import type { NoteFilters } from "@/types";

interface NoteListPanelProps {
  baseFilters: NoteFilters;
  onOpen: (uuid: string) => void;
  onNew?: () => void;
}

const CATEGORIES = ["lead","client","project","meeting","branding","personal","business","other"] as const;
const PRIORITIES = ["low","medium","high","critical"] as const;

export function NoteListPanel({ baseFilters, onOpen, onNew }: NoteListPanelProps) {
  const { tags } = useNoteTags();
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  // local filter state — merged on top of baseFilters
  const [category, setCategory]         = useState("");
  const [priority, setPriority]         = useState("");
  const [sortBy, setSortBy]             = useState<string>("newest");
  const [starredOnly, setStarredOnly]   = useState(false);
  const [hasAttach, setHasAttach]       = useState(false);
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // reset local overrides when base filters change
  const baseKey = JSON.stringify(baseFilters);
  const prevBaseKey = useRef(baseKey);
  useEffect(() => {
    if (baseKey !== prevBaseKey.current) {
      prevBaseKey.current = baseKey;
      setCategory(""); setPriority(""); setSortBy("newest");
      setStarredOnly(false); setHasAttach(false);
      setSearch(""); setDebouncedSearch("");
    }
  }, [baseKey]);

  // debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const mergedFilters: NoteFilters = {
    ...baseFilters,
    ...(category     ? { category }           : {}),
    ...(priority     ? { priority }           : {}),
    ...(sortBy       ? { sortBy: sortBy as NoteFilters["sortBy"] } : {}),
    ...(starredOnly  ? { isStarred: true }    : {}),
    ...(hasAttach    ? { hasAttachments: true }: {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const { notes, total, isLoading, hasMore, loadMore, isLoadingMore, refetch } = useNotes(mergedFilters);
  const { recentSearches, clearRecent } = useNoteSearch();

  // Bulk selection
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const toggleSelect = useCallback((uuid: string, checked: boolean) => {
    setSelectedUuids(prev => {
      const next = new Set(prev);
      checked ? next.add(uuid) : next.delete(uuid);
      return next;
    });
  }, []);

  const hasFilters = !!(category || priority || starredOnly || hasAttach || debouncedSearch);
  const selectedArr = Array.from(selectedUuids);

  async function bulkAction(action: "star" | "archive" | "delete") {
    if (!selectedArr.length) return;
    try {
      if (action === "star")    await api.post("/notes/bulk/star",    { uuids: selectedArr, starred: true });
      if (action === "archive") await api.post("/notes/bulk/archive", { uuids: selectedArr });
      if (action === "delete")  await api.post("/notes/bulk/delete",  { uuids: selectedArr });
      toast.success(`${selectedArr.length} note(s) updated`);
      setSelectedUuids(new Set());
      refetch();
    } catch {
      toast.error("Bulk action failed");
    }
  }

  async function bulkTagAction(tagUuid: string) {
    if (!selectedArr.length || !tagUuid) return;
    try {
      await api.post("/notes/bulk/tag", { uuids: selectedArr, tagId: tagUuid });
      toast.success("Tag applied");
      setSelectedUuids(new Set());
      refetch();
    } catch {
      toast.error("Failed to apply tag");
    }
  }

  const showRecentDropdown = searchFocused && !search && recentSearches.length > 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={e => { setSearchFocused(true); (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={e => { setTimeout(() => setSearchFocused(false), 150); (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          placeholder="Search notes..."
          className="w-full rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        {search && (
          <button
            onClick={() => { setSearch(""); setDebouncedSearch(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={13} />
          </button>
        )}
        {showRecentDropdown && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-2"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>Recent</span>
              <button onClick={clearRecent} className="text-[11px]" style={{ color: "var(--accent)" }}>Clear</button>
            </div>
            {recentSearches.slice(0, 5).map(r => (
              <button
                key={r.term}
                onClick={() => { setSearch(r.term); setSearchFocused(false); }}
                className="w-full text-left px-3 py-1.5 text-sm"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {r.term}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>

        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="updated">Recently Updated</option>
        </select>

        <button
          onClick={() => setStarredOnly(v => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all"
          style={{
            background: starredOnly ? "rgba(245,158,11,0.15)" : "var(--bg-elevated)",
            border: `1px solid ${starredOnly ? "#f59e0b" : "var(--border)"}`,
            color: starredOnly ? "#f59e0b" : "var(--text-secondary)",
          }}
        >
          <Star size={11} fill={starredOnly ? "#f59e0b" : "none"} />
          Starred
        </button>

        <button
          onClick={() => setHasAttach(v => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all"
          style={{
            background: hasAttach ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
            border: `1px solid ${hasAttach ? "#6366f1" : "var(--border)"}`,
            color: hasAttach ? "#6366f1" : "var(--text-secondary)",
          }}
        >
          <Paperclip size={11} />
          Has Files
        </button>

        {hasFilters && (
          <button
            onClick={() => { setCategory(""); setPriority(""); setSortBy("newest"); setStarredOnly(false); setHasAttach(false); setSearch(""); setDebouncedSearch(""); }}
            className="text-xs ml-auto"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {total} note{total !== 1 ? "s" : ""}
          {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState status={baseFilters.status} search={debouncedSearch} onNew={onNew} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {notes.map(note => (
              <NoteCard
                key={note.uuid}
                note={note}
                onOpen={onOpen}
                onSelect={toggleSelect}
                isSelected={selectedUuids.has(note.uuid)}
                onRefetch={refetch}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {isLoadingMore ? "Loading…" : `Load more · ${total - notes.length} remaining`}
            </button>
          )}
        </>
      )}

      {/* Bulk action bar */}
      {selectedArr.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {selectedArr.length} selected
          </span>
          <div className="h-4 w-px" style={{ background: "var(--border)" }} />
          <button onClick={() => bulkAction("star")}    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}><Star size={12} fill="#f59e0b" />Star</button>
          <button onClick={() => bulkAction("archive")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}><Archive size={12} />Archive</button>
          <button onClick={() => bulkAction("delete")}  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}><Trash2 size={12} />Delete</button>
          {tags.length > 0 && (
            <select
              onChange={e => { if (e.target.value) bulkTagAction(e.target.value); e.target.value = ""; }}
              defaultValue=""
              className="rounded-lg px-2 py-1.5 text-xs outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="" disabled><Tag size={10} />Add Tag</option>
              {tags.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => setSelectedUuids(new Set())} style={{ color: "var(--text-secondary)" }}><X size={14} /></button>
        </div>
      )}

      <TagManagerDialog open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
    </div>
  );
}

function EmptyState({ status, search, onNew }: { status?: string; search?: string; onNew?: () => void }) {
  if (search) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Search size={40} style={{ color: "var(--text-secondary)", opacity: 0.3 }} />
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No notes match &ldquo;{search}&rdquo;</p>
    </div>
  );

  const msgs: Record<string, { icon: React.ElementType; msg: string; sub?: string }> = {
    deleted:  { icon: Trash2,   msg: "No deleted notes", sub: "Deleted notes appear here and are removed after 30 days." },
    archived: { icon: Archive,  msg: "No archived notes" },
  };
  const cfg = msgs[status ?? ""] ?? { icon: Search, msg: "No notes yet" };
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Icon size={40} style={{ color: "var(--text-secondary)", opacity: 0.3 }} />
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{cfg.msg}</p>
      {cfg.sub && <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-secondary)" }}>{cfg.sub}</p>}
      {!status || status === "active" ? (
        <button
          onClick={onNew}
          className="mt-2 rounded-xl px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Create first note
        </button>
      ) : null}
    </div>
  );
}
