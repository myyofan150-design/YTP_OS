"use client";

import { useState, useEffect, useRef } from "react";
import { X, Users, Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTodoGroups } from "@/hooks/useTodo";
import type { ApiResponse, TodoList } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  "#6366F1", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
];

interface EmpOption { id: number; name: string; email: string; avatarUrl?: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (list: TodoList) => void;
}

export function NewListDialog({ open, onClose, onCreated }: Props) {
  const { groups } = useTodoGroups();

  const [name,       setName]       = useState("");
  const [color,      setColor]      = useState(COLOR_OPTIONS[0]);
  const [groupId,    setGroupId]    = useState<string>("");
  const [saving,     setSaving]     = useState(false);

  // member picker state
  const [employees,    setEmployees]    = useState<EmpOption[]>([]);
  const [empSearch,    setEmpSearch]    = useState("");
  const [selected,     setSelected]     = useState<EmpOption[]>([]);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // load employees once when dialog opens
  useEffect(() => {
    if (!open) return;
    api.get<ApiResponse<EmpOption[]>>("/employees/directory")
      .then(r => setEmployees(r.data.data ?? []))
      .catch(() => {});
  }, [open]);

  // close picker on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function reset() {
    setName(""); setColor(COLOR_OPTIONS[0]); setGroupId("");
    setSelected([]); setEmpSearch(""); setPickerOpen(false);
  }

  function toggleEmployee(emp: EmpOption) {
    setSelected(prev =>
      prev.some(s => s.id === emp.id)
        ? prev.filter(s => s.id !== emp.id)
        : [...prev, emp]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const r = await api.post<ApiResponse<TodoList>>("/todo/lists", {
        name: n,
        color,
        groupId: groupId || null,
        memberUserIds: selected.map(s => s.id),
      });
      toast.success("List created");
      reset();
      onCreated(r.data.data);
      onClose();
    } catch {
      toast.error("Failed to create list");
    } finally {
      setSaving(false);
    }
  }

  const filteredEmps = employees.filter(e =>
    (e.name ?? "").toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.email ?? "").toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New List</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="List name…"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: color === c ? "var(--accent)" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {groups.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Group (optional)</label>
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.uuid} value={g.uuid}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Employee sharing (optional) ─────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users size={12} /> Share with employees (optional)
            </label>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {selected.map(emp => (
                  <span
                    key={emp.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{ background: `${color}15`, borderColor: `${color}40`, color }}
                  >
                    {emp.name}
                    <button
                      type="button"
                      onClick={() => toggleEmployee(emp)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Picker */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen(v => !v)}
                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-left text-muted-foreground flex items-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Search size={13} />
                {selected.length === 0
                  ? "Search employees…"
                  : `${selected.length} selected`}
              </button>

              {pickerOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input
                      autoFocus
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      placeholder="Search…"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {filteredEmps.length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-4 text-center">No employees found</p>
                    )}
                    {filteredEmps.map(emp => {
                      const isChecked = selected.some(s => s.id === emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleEmployee(emp)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/50 transition-colors text-left"
                        >
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                            style={{
                              background:   isChecked ? color : "transparent",
                              borderColor:  isChecked ? color : "var(--border)",
                            }}
                          >
                            {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={!name.trim() || saving} className="flex-1">
              {saving ? "Creating…" : "Create List"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); onClose(); }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
