"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Grid3X3, Loader2 } from "lucide-react";

interface WorkspaceItem {
  id: number;
  uuid: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  createdAt: string;
  _count: { properties: number; entries: number };
}

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#eab308",
  "#22c55e","#14b8a6","#06b6d4","#3b82f6",
];

const EMOJIS = ["📋","📊","📁","🗂️","📌","🔖","⚡","🎯","🏷️","💡","🔧","📝","🚀","💼","🌐"];

function NewWorkspaceModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName]   = useState("");
  const [icon, setIcon]   = useState("📋");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/workspace", { name, icon, color });
      onCreated();
      onClose();
    } catch {
      alert("Failed to create workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Client Tracker"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
            />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`text-lg p-1 rounded transition-colors ${icon === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "hover:bg-gray-100"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacePage() {
  const { user } = useAuth();
  const isAdmin  = user?.role && ["SUPER_ADMIN","ADMIN"].includes(user.role);
  const [workspaces, setWS] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/workspace");
      setWS(res.data.data);
    } catch { setWS([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
          <p className="text-sm text-gray-500 mt-0.5">Notion-style custom databases for your team</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />New Workspace
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Grid3X3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No workspaces yet</p>
          {isAdmin && (
            <Button variant="outline" className="mt-3" onClick={() => setShowNew(true)}>
              Create your first workspace
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map(ws => (
            <Link
              key={ws.uuid}
              href={`/workspace/${ws.uuid}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              style={{ borderTop: `3px solid ${ws.color ?? "#6366f1"}` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{ws.icon ?? "📋"}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {ws.name}
                  </h3>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>{ws._count.properties} {ws._count.properties === 1 ? "column" : "columns"}</span>
                    <span>·</span>
                    <span>{ws._count.entries} {ws._count.entries === 1 ? "entry" : "entries"}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <NewWorkspaceModal onCreated={load} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}
