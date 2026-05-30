"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Info, Pin, Search, Paperclip, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConversation, useMessages } from "@/hooks/useChat";
import { useChatSocket }                 from "@/hooks/useChatSocket";
import { MessageBubble }                 from "./MessageBubble";
import { ConversationInfoPanel }         from "./ConversationInfoPanel";
import type { ChatMessage } from "@/types";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api$/, "");

function dateSeparator(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface Props {
  conversationUuid: string;
  onBack:           () => void;
  currentUserId:    number;
  currentUserRole:  string;
}

interface TypingUser { userId: number; }

export function MessageViewPanel({ conversationUuid, onBack, currentUserId, currentUserRole }: Props) {
  const { conversation }                                           = useConversation(conversationUuid);
  const { messages, isLoading, hasMore, loadMore, appendMessage, updateMessage, refetch } = useMessages(conversationUuid);
  const { joinConversation, leaveConversation, startTyping, stopTyping, markRead, reactToMessage, onEvent } = useChatSocket();

  const [inputText,    setInputText]    = useState("");
  const [replyTo,      setReplyTo]      = useState<ChatMessage | null>(null);
  const [typingUsers,  setTypingUsers]  = useState<TypingUser[]>([]);
  const [showInfo,     setShowInfo]     = useState(false);
  const [editingMsg,   setEditingMsg]   = useState<ChatMessage | null>(null);
  const [sendingFile,  setSendingFile]  = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // ── Mount/Unmount ────────────────────────────────────────────────────────────
  useEffect(() => {
    joinConversation(conversationUuid);
    markRead(conversationUuid);
    return () => { leaveConversation(conversationUuid); };
  }, [conversationUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    cleanups.push(onEvent("message:new", (msg: ChatMessage) => {
      if (msg.conversationId === conversation?.id || String(msg.uuid)) {
        appendMessage(msg);
        scrollToBottom();
        markRead(conversationUuid);
      }
    }));

    cleanups.push(onEvent("typing:started", ({ userId }: { userId: number }) => {
      if (userId !== currentUserId) {
        setTypingUsers(prev => prev.some(t => t.userId === userId) ? prev : [...prev, { userId }]);
        // auto-clear after 5s
        setTimeout(() => setTypingUsers(prev => prev.filter(t => t.userId !== userId)), 5_000);
      }
    }));

    cleanups.push(onEvent("typing:stopped", ({ userId }: { userId: number }) => {
      setTypingUsers(prev => prev.filter(t => t.userId !== userId));
    }));

    cleanups.push(onEvent("message:reaction_updated", ({ messageUuid, reactions }: { messageUuid: string; reactions: ChatMessage["reactions"] }) => {
      updateMessage({ uuid: messageUuid, reactions } as ChatMessage);
    }));

    return () => cleanups.forEach(fn => fn());
  }, [conversationUuid, conversation?.id, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom when messages load ─────────────────────────────────────
  useEffect(() => { scrollToBottom(); }, [messages.length]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ── Textarea auto-grow ───────────────────────────────────────────────────────
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";

    // Typing indicator
    startTyping(conversationUuid);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => stopTyping(conversationUuid), 2_000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const content = inputText.trim();
    if (!content && !editingMsg) return;

    if (editingMsg) {
      // Edit mode
      try {
        const r = await api.patch(`/chat/conversations/${conversationUuid}/messages/${editingMsg.uuid}`, { content });
        updateMessage(r.data.data);
      } catch { toast.error("Failed to edit message"); }
      setEditingMsg(null);
    } else {
      // New message
      try {
        const r = await api.post(`/chat/conversations/${conversationUuid}/messages`, {
          content,
          replyToId: replyTo?.uuid,
        });
        appendMessage(r.data.data);
        scrollToBottom();
      } catch { toast.error("Failed to send message"); }
    }

    setInputText("");
    setReplyTo(null);
    stopTyping(conversationUuid);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
  }

  // ── File upload ──────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSendingFile(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api.post(`/chat/conversations/${conversationUuid}/messages/attachment`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      appendMessage(r.data.data);
      scrollToBottom();
    } catch { toast.error("Failed to upload file"); }
    finally { setSendingFile(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  // ── Reactions ────────────────────────────────────────────────────────────────
  function handleReact(msgUuid: string, emoji: string) {
    reactToMessage(msgUuid, emoji, conversationUuid);
  }

  // ── Pin/Unpin ────────────────────────────────────────────────────────────────
  async function handlePin(msgUuid: string, isPinned: boolean) {
    try {
      if (isPinned) {
        await api.delete(`/chat/conversations/${conversationUuid}/messages/${msgUuid}/pin`);
      } else {
        await api.post(`/chat/conversations/${conversationUuid}/messages/${msgUuid}/pin`);
      }
      refetch();
    } catch { toast.error("Failed to pin/unpin message"); }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(msgUuid: string) {
    if (!confirm("Delete this message?")) return;
    try {
      await api.delete(`/chat/conversations/${conversationUuid}/messages/${msgUuid}`);
      refetch();
    } catch { toast.error("Failed to delete message"); }
  }

  // ── Date separators ──────────────────────────────────────────────────────────
  function shouldShowDate(idx: number): boolean {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    const curr = messages[idx];
    return new Date(curr.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
  }

  const displayName = conversation?.name ?? conversation?.otherUser?.name ?? "Loading…";
  const isGroup     = conversation?.type !== "direct";
  const pinnedMsgs  = messages.filter(m => m.isPinned);

  const typingNames = typingUsers.map(t => {
    const member = conversation?.members?.find(m => m.userId === t.userId);
    return member?.name ?? `User ${t.userId}`;
  });

  return (
    <div className="flex flex-col h-full min-h-0 relative">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 h-16 shrink-0"
        style={{ borderBottom: "1px solid #e9edef", background: "#ffffff" }}
      >
        <button onClick={onBack} className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: "#667781" }}>
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: `hsl(${displayName.charCodeAt(0) % 360},55%,42%)` }}
          >
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate" style={{ color: "#111827" }}>{displayName}</p>
            <p className="text-[12px] leading-tight" style={{ color: typingUsers.length > 0 ? "#00BFA5" : "#667781" }}>
              {typingUsers.length > 0
                ? "Typing..."
                : isGroup && conversation?.members
                  ? `${conversation.members.length} members`
                  : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <HeaderBtn icon={<Search size={16} />} title="Search" onClick={() => {}} />
          {pinnedMsgs.length > 0 && (
            <HeaderBtn icon={<Pin size={16} />} title="Pinned messages" onClick={() => setShowInfo(true)} />
          )}
          <HeaderBtn icon={<Info size={16} />} title="Info" onClick={() => setShowInfo(v => !v)} />
        </div>
      </div>

      {/* ── Pinned bar ────────────────────────────────────────────────────────── */}
      {pinnedMsgs.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 shrink-0"
          style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}
        >
          <Pin size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <span className="text-xs truncate flex-1" style={{ color: "#f59e0b" }}>
            📌 {pinnedMsgs[0]!.content.slice(0, 60)}{pinnedMsgs[0]!.content.length > 60 ? "…" : ""}
          </span>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3" style={{ paddingBottom: 80, background: "#f0f2f5" }}>

        {/* Load earlier */}
        {hasMore && (
          <div className="flex justify-center mb-3">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="text-xs font-medium px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.9)", color: "#667781", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" }}
            >
              {isLoading ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}

        {isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#00BFA5" }} />
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.uuid}>
            {/* Date separator */}
            {shouldShowDate(idx) && (
              <div className="flex justify-center my-3">
                <span
                  className="text-[12px] px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.85)", color: "#667781", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" }}
                >
                  {dateSeparator(msg.createdAt)}
                </span>
              </div>
            )}
            <MessageBubble
              message={msg}
              isOwn={msg.senderId === currentUserId}
              isGroup={isGroup}
              onReply={setReplyTo}
              onReact={handleReact}
              onPin={handlePin}
              onEdit={m => { setEditingMsg(m); setInputText(m.content); textareaRef.current?.focus(); }}
              onDelete={handleDelete}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              conversationUuid={conversationUuid}
            />
          </div>
        ))}

        {/* Typing indicator bubble */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 px-2 mb-1">
            <div className="flex gap-1 items-center px-3 py-2.5 rounded-[8px]"
              style={{ background: "#ffffff", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" }}>
              {[0, 1, 2].map(i => (
                <span key={i} className="h-2 w-2 rounded-full animate-bounce"
                  style={{ background: "#b0bec5", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply / Edit preview ───────────────────────────────────────────────── */}
      {(replyTo || editingMsg) && (
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: "#ffffff", borderTop: "1px solid #e9edef", borderLeft: `3px solid #00BFA5` }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "#00BFA5" }}>
              {editingMsg ? "Editing message" : `Replying to ${replyTo!.sender?.name ?? "Unknown"}`}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "#667781" }}>
              {editingMsg ? editingMsg.content : replyTo?.content}
            </p>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInputText(""); }}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
            style={{ color: "#667781" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0f2f5"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────────────── */}
      <div
        className="flex items-end gap-2 px-3 py-2.5 shrink-0"
        style={{ background: "#f0f2f5" }}
      >
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sendingFile}
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "#00BFA5", color: "#ffffff" }}
          title="Attach file"
        >
          <Paperclip size={17} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type something here..."
          className="flex-1 resize-none rounded-full px-4 py-2.5 text-[14px] outline-none scrollbar-thin"
          style={{
            background: "#ffffff",
            border: "none",
            color: "#111827",
            minHeight: 40,
            maxHeight: 120,
            boxShadow: "0 1px 0.5px rgba(11,20,26,0.1)",
          }}
        />

        <button
          onClick={handleSend}
          disabled={!inputText.trim() && !sendingFile}
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "#00BFA5", color: "#ffffff" }}
        >
          <Send size={17} />
        </button>
      </div>

      {/* ── Info panel ──────────────────────────────────────────────────────────── */}
      {showInfo && (
        <ConversationInfoPanel
          conversationUuid={conversationUuid}
          currentUserRole={currentUserRole}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}

function HeaderBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
      style={{ color: "#54656f" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0f2f5"; (e.currentTarget as HTMLElement).style.color = "#111827"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#54656f"; }}
    >
      {icon}
    </button>
  );
}
