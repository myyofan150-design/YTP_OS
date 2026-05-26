"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiResponse, TodoGroup } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  "#6366F1", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (group: TodoGroup) => void;
}

export function NewGroupDialog({ open, onClose, onCreated }: Props) {
  const [name, setName]     = useState("");
  const [color, setColor]   = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  function reset() { setName(""); setColor(COLOR_OPTIONS[0]); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const r = await api.post<ApiResponse<TodoGroup>>("/todo/groups", { name: n, color });
      toast.success("Group created");
      reset();
      onCreated(r.data.data);
      onClose();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Group name…"
              maxLength={50}
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

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={!name.trim() || saving} className="flex-1">
              {saving ? "Creating…" : "Create Group"}
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
