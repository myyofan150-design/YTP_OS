"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse, Note, NoteTag, NoteFilters } from "@/types";

// ─── useNoteTags ───────────────────────────────────────────────────────────────

export function useNoteTags() {
  const [tags, setTags]       = useState<NoteTag[]>([]);
  const [isLoading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<NoteTag[]>>("/notes/tags");
      setTags(r.data.data ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  async function createTag(name: string, color?: string): Promise<boolean> {
    try {
      await api.post("/notes/tags", { name, color });
      await refetch();
      toast.success("Tag created");
      return true;
    } catch {
      toast.error("Failed to create tag");
      return false;
    }
  }

  async function updateTag(uuid: string, data: { name?: string; color?: string }): Promise<boolean> {
    try {
      await api.patch(`/notes/tags/${uuid}`, data);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update tag");
      return false;
    }
  }

  async function deleteTag(uuid: string): Promise<boolean> {
    try {
      await api.delete(`/notes/tags/${uuid}`);
      await refetch();
      toast.success("Tag deleted");
      return true;
    } catch {
      toast.error("Failed to delete tag");
      return false;
    }
  }

  return { tags, isLoading, refetch, createTag, updateTag, deleteTag };
}

// ─── useNotes ─────────────────────────────────────────────────────────────────

interface NotesListData { notes: Note[]; total: number; page: number; limit: number; }

export function useNotes(filters: NoteFilters) {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const filtersKey = JSON.stringify({ ...filters, page: undefined });
  const prevFiltersKey = useRef(filtersKey);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params: Record<string, unknown> = { ...filters, page: pageNum };
      // strip undefined/null
      Object.keys(params).forEach(k => (params[k] == null || params[k] === "") && delete params[k]);
      const r = await api.get<ApiResponse<NotesListData>>("/notes", { params });
      const data = r.data.data;
      setTotal(data.total);
      setPage(data.page);
      setNotes(prev => append ? [...prev, ...data.notes] : data.notes);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset when filters (excluding page) change
  useEffect(() => {
    const key = JSON.stringify({ ...filters, page: undefined });
    if (key !== prevFiltersKey.current) {
      prevFiltersKey.current = key;
      setPage(1);
      fetchPage(1, false);
    }
  }, [filtersKey, fetchPage, filters]);

  // initial load
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      fetchPage(1, false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function refetch() { fetchPage(page, false); }

  function loadMore() {
    const nextPage = page + 1;
    fetchPage(nextPage, true);
  }

  const limit = filters.limit ?? 30;
  const hasMore = notes.length < total && notes.length >= limit;

  return { notes, total, isLoading, isLoadingMore, page, hasMore, refetch, loadMore };
}

// ─── useNote ──────────────────────────────────────────────────────────────────

export function useNote(uuid: string | null) {
  const [note, setNote]         = useState<Note | null>(null);
  const [isLoading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<Note>>(`/notes/${uuid}`);
      setNote(r.data.data);
    } catch {
      toast.error("Failed to load note");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  return { note, isLoading, refetch };
}

// ─── useNoteStats ─────────────────────────────────────────────────────────────

interface NoteStats {
  total: number;
  starred: number;
  archived: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentlyUpdated: Array<{ id: number; uuid: string; title: string; updatedAt: string; category: string; priority: string }>;
}

export function useNoteStats() {
  const [stats, setStats]       = useState<NoteStats | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<NoteStats>>("/notes/stats");
      setStats(r.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { stats, isLoading, refetch };
}

// ─── useNoteSearch ────────────────────────────────────────────────────────────

export function useNoteSearch() {
  const [results, setResults]             = useState<Note[]>([]);
  const [recentSearches, setRecentSearches] = useState<Array<{ term: string; searchedAt: string }>>([]);
  const [isSearching, setSearching]       = useState(false);

  async function search(query: string): Promise<void> {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api.get<ApiResponse<Note[]>>("/notes/search", { params: { q: query } });
      setResults(r.data.data ?? []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  const fetchRecent = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<Array<{ term: string; searchedAt: string }>>>("/notes/search/recent");
      setRecentSearches(r.data.data ?? []);
    } catch {
      // non-fatal
    }
  }, []);

  async function clearRecent(): Promise<void> {
    try {
      await api.delete("/notes/search/recent");
      setRecentSearches([]);
    } catch {
      toast.error("Failed to clear recent searches");
    }
  }

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  return { results, recentSearches, isSearching, search, clearRecent, fetchRecent };
}
