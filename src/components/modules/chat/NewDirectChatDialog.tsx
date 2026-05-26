"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

interface UserResult {
  id: number;
  uuid: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  email: string;
}

interface Props {
  onClose:   () => void;
  onCreated: (uuid: string) => void;
}

export function NewDirectChatDialog({ onClose, onCreated }: Props) {
  const [search,    setSearch]    = useState("");
  const [results,   setResults]   = useState<UserResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [creating,  setCreating]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!search.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get<ApiResponse<UserResult[]>>("/users", { params: { search, limit: 10 } });
        setResults(r.data.data ?? []);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [search]);

  async function handleSelect(u: UserResult) {
    setCreating(true);
    try {
      const r = await api.post("/chat/conversations/direct", { targetUserUuid: u.uuid });
      onCreated(r.data.data.uuid);
      onClose();
    } catch {
      toast.error("Failed to open conversation");
    } finally {
      setCreating(false);
    }
  }

  const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/api$/, "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden animate-slide-up"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>New Message</span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div
            className="flex items-center gap-2 px-3 h-9 rounded-lg"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <Search size={14} style={{ color: "var(--text-secondary)" }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            {loading && <Loader2 size={13} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto scrollbar-thin pb-2">
          {results.length === 0 && search.trim() && !loading ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>No users found</p>
          ) : (
            results.map(u => (
              <button
                key={u.uuid}
                onClick={() => handleSelect(u)}
                disabled={creating}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {u.avatarUrl ? (
                  <img src={`${API_ROOT}/${u.avatarUrl}`} alt={u.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                    style={{ background: `hsl(${u.name.charCodeAt(0) % 360},55%,40%)` }}
                  >
                    {u.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                    {u.role.replace(/_/g, " ")}
                  </p>
                </div>
                {creating && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--text-secondary)" }} />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
