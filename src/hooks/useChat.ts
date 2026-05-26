"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import api from "@/lib/api";
import type { ApiResponse, ChatConversation, ChatMessage } from "@/types";

// ─── useConversations ─────────────────────────────────────────────────────────

export function useConversations(archived = false) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setLoading]           = useState(true);

  const refetch = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<ChatConversation[]>>("/chat/conversations", {
        params: { archived },
      });
      setConversations(r.data.data ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [archived]);

  useEffect(() => { refetch(); }, [refetch]);

  return { conversations, isLoading, refetch };
}

// ─── useConversation ──────────────────────────────────────────────────────────

export function useConversation(uuid: string | null) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setLoading]         = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<ChatConversation>>(`/chat/conversations/${uuid}`);
      setConversation(r.data.data ?? null);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  return { conversation, isLoading, refetch };
}

// ─── useMessages ──────────────────────────────────────────────────────────────

interface MessagesPage {
  messages: ChatMessage[];
  nextCursor?: string;
  hasMore: boolean;
}

export function useMessages(conversationUuid: string | null) {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [isLoading, setLoading]       = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [nextCursor, setNextCursor]   = useState<string | undefined>(undefined);

  const refetch = useCallback(async () => {
    if (!conversationUuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<MessagesPage>>(
        `/chat/conversations/${conversationUuid}/messages`
      );
      const page = r.data.data;
      // Backend returns newest-first (DESC); reverse so oldest is at top
      setMessages((page?.messages ?? []).slice().reverse());
      setHasMore(page?.hasMore ?? false);
      setNextCursor(page?.nextCursor);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [conversationUuid]);

  useEffect(() => {
    setMessages([]);
    setNextCursor(undefined);
    setHasMore(false);
    refetch();
  }, [conversationUuid, refetch]);

  const loadMore = useCallback(async () => {
    if (!conversationUuid || !hasMore || !nextCursor || isLoading) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<MessagesPage>>(
        `/chat/conversations/${conversationUuid}/messages`,
        { params: { before: nextCursor } }
      );
      const page = r.data.data;
      // Older messages (from "load more") prepend at top, also reversed
      setMessages(prev => [...(page?.messages ?? []).slice().reverse(), ...prev]);
      setHasMore(page?.hasMore ?? false);
      setNextCursor(page?.nextCursor);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [conversationUuid, hasMore, nextCursor, isLoading]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.uuid === msg.uuid)) return prev;
      return [...prev, msg];
    });
  }, []);

  const updateMessage = useCallback((updatedMsg: ChatMessage) => {
    setMessages(prev => prev.map(m => m.uuid === updatedMsg.uuid ? updatedMsg : m));
  }, []);

  return { messages, isLoading, hasMore, loadMore, refetch, appendMessage, updateMessage };
}

// ─── useTotalUnread ───────────────────────────────────────────────────────────

export function useTotalUnread() {
  const [count, setCount]     = useState(0);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<{ total: number; conversations: Record<string, number> }>>("/chat/unread");
      setCount(r.data.data?.total ?? 0);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch]);

  return { count, refetch: fetch };
}
