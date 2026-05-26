"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { Plus, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NoteListPanel } from "@/components/modules/notes/NoteListPanel";
import { NoteFormDialog } from "@/components/modules/notes/NoteFormDialog";
import { NoteDetailSheet } from "@/components/modules/notes/NoteDetailSheet";
import { TagManagerDialog } from "@/components/modules/notes/TagManagerDialog";
import { useNoteTags } from "@/hooks/useNotes";
import type { NoteFilters } from "@/types";

function NotesPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { tags, refetch: refetchTags } = useNoteTags();

  const filter   = searchParams.get("filter");
  const tagId    = searchParams.get("tagId");
  const category = searchParams.get("category") ?? undefined;

  // Dialog states
  const [detailUuid, setDetailUuid]       = useState<string | null>(null);
  const [formOpen, setFormOpen]           = useState(false);
  const [editUuid, setEditUuid]           = useState<string | undefined>(undefined);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [listKey, setListKey]             = useState(0); // bump to force list refetch

  const baseFilters = useMemo((): NoteFilters => {
    if (filter === "starred")  return { isStarred: true, status: "active",   sortBy: "newest" };
    if (filter === "assigned") return { assignedTo: String(user?.id ?? ""), status: "active", sortBy: "newest" };
    if (filter === "archived") return { status: "archived", sortBy: "newest" };
    if (filter === "deleted")  return { status: "deleted",  sortBy: "newest" };
    if (tagId)                 return { tagId, status: "active", sortBy: "newest" };
    if (category)              return { category, status: "active", sortBy: "newest" };
    return { status: "active", sortBy: "newest" };
  }, [filter, tagId, category, user?.id]);

  const activeTag = tagId ? tags.find(t => t.uuid === tagId) : null;

  function pageTitle() {
    if (filter === "starred")  return "Starred";
    if (filter === "assigned") return "Assigned to Me";
    if (filter === "archived") return "Archived";
    if (filter === "deleted")  return "Deleted";
    if (activeTag)             return activeTag.name;
    return "All Notes";
  }

  function openCreate() { setEditUuid(undefined); setFormOpen(true); }

  function openEdit(uuid: string) { setEditUuid(uuid); setDetailUuid(null); setFormOpen(true); }

  function handleFormSaved() { setListKey(k => k + 1); refetchTags(); }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {pageTitle()}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTagManagerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <Settings size={14} />
            Tags
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <Plus size={14} />
            New Note
          </button>
        </div>
      </div>

      {/* List panel — key forces remount when list needs hard reset */}
      <NoteListPanel
        key={listKey}
        baseFilters={baseFilters}
        onOpen={uuid => setDetailUuid(uuid)}
        onNew={openCreate}
      />

      {/* Detail sheet (slide-in from right) */}
      <NoteDetailSheet
        noteUuid={detailUuid}
        onClose={() => setDetailUuid(null)}
        onEdit={openEdit}
        onRefetch={handleFormSaved}
      />

      {/* Create / Edit dialog */}
      <NoteFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        noteUuid={editUuid}
        onSaved={handleFormSaved}
      />

      {/* Tag manager */}
      <TagManagerDialog
        open={tagManagerOpen}
        onClose={() => { setTagManagerOpen(false); refetchTags(); }}
      />
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading…
      </div>
    }>
      <NotesPageInner />
    </Suspense>
  );
}
