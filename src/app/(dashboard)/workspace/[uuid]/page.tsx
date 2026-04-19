"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, ArrowLeft, Settings } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prop {
  id: number;
  name: string;
  type: string;
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
}

interface Entry {
  id: number;
  uuid: string;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface WorkspaceDetail {
  id: number;
  uuid: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  properties: Prop[];
  entries: Entry[];
}

const PROP_TYPES = ["TEXT","NUMBER","DATE","SELECT","MULTI_SELECT","URL","EMAIL","CHECKBOX"];

// ─── Cell Renderer ────────────────────────────────────────────────────────────

function CellValue({ type, value, options }: { type: string; value: unknown; options?: string[] | null }) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-300">—</span>;

  if (type === "CHECKBOX") {
    return <span>{value ? "✅" : "☐"}</span>;
  }
  if (type === "DATE") {
    return <span>{new Date(value as string).toLocaleDateString("en-IN")}</span>;
  }
  if (type === "URL") {
    return <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs truncate max-w-[120px] block">{value as string}</a>;
  }
  if (type === "SELECT") {
    return <Badge variant="outline" className="text-xs">{value as string}</Badge>;
  }
  if (type === "MULTI_SELECT" && Array.isArray(value)) {
    return <div className="flex flex-wrap gap-1">{(value as string[]).map(v => <Badge key={v} variant="outline" className="text-xs">{v}</Badge>)}</div>;
  }
  void options;
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}

// ─── Add Property Modal ───────────────────────────────────────────────────────

function AddPropertyModal({
  wsUuid,
  onAdded,
  onClose,
}: { wsUuid: string; onAdded: () => void; onClose: () => void }) {
  const [name, setName]         = useState("");
  const [type, setType]         = useState("TEXT");
  const [options, setOptions]   = useState("");
  const [required, setRequired] = useState(false);
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspace/${wsUuid}/properties`, {
        name, type,
        options: ["SELECT","MULTI_SELECT"].includes(type)
          ? options.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        isRequired: required,
        sortOrder: 0,
      });
      onAdded();
      onClose();
    } catch {
      alert("Failed to add property");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Status" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v ?? type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {["SELECT","MULTI_SELECT"].includes(type) && (
            <div>
              <Label>Options (comma-separated)</Label>
              <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="e.g. Active, Inactive" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
            Required field
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────

function AddEntryModal({
  wsUuid,
  properties,
  onAdded,
  onClose,
}: { wsUuid: string; properties: Prop[]; onAdded: () => void; onClose: () => void }) {
  const [title, setTitle]   = useState("");
  const [data, setData]     = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function setField(id: number, val: string) {
    setData(prev => ({ ...prev, [String(id)]: val }));
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/workspace/${wsUuid}/entries`, { title, data });
      onAdded();
      onClose();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Entry</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title" />
          </div>
          {properties.map(prop => (
            <div key={prop.id}>
              <Label>{prop.name}{prop.isRequired && <span className="text-red-500 ml-0.5">*</span>}</Label>
              {prop.type === "SELECT" && prop.options ? (
                <Select value={data[String(prop.id)] ?? "_none"} onValueChange={v => setField(prop.id, v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {prop.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : prop.type === "CHECKBOX" ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    checked={data[String(prop.id)] === "true"}
                    onChange={e => setField(prop.id, e.target.checked ? "true" : "false")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-600">Yes</span>
                </div>
              ) : prop.type === "DATE" ? (
                <Input type="date" value={data[String(prop.id)] ?? ""} onChange={e => setField(prop.id, e.target.value)} />
              ) : prop.type === "NUMBER" ? (
                <Input type="number" value={data[String(prop.id)] ?? ""} onChange={e => setField(prop.id, e.target.value)} />
              ) : (
                <Input
                  type={prop.type === "EMAIL" ? "email" : prop.type === "URL" ? "url" : "text"}
                  value={data[String(prop.id)] ?? ""}
                  onChange={e => setField(prop.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspaceDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router   = useRouter();
  const { user } = useAuth();
  const isAdmin  = user?.role && ["SUPER_ADMIN","ADMIN"].includes(user.role);

  const [ws, setWS]             = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showProp, setShowProp] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [editCell, setEditCell] = useState<{ entryUuid: string; propId: number; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workspace/${uuid}`);
      setWS(res.data.data);
    } catch { router.push("/workspace"); } finally { setLoading(false); }
  }, [uuid, router]);

  useEffect(() => { load(); }, [load]);

  async function deleteProp(propId: number) {
    if (!confirm("Delete this property? All entry data for this column will be lost.")) return;
    await api.delete(`/workspace/${uuid}/properties/${propId}`).catch(() => {});
    load();
  }

  async function deleteEntry(entryUuid: string) {
    if (!confirm("Delete this entry?")) return;
    await api.delete(`/workspace/${uuid}/entries/${entryUuid}`).catch(() => {});
    load();
  }

  async function saveCell() {
    if (!editCell) return;
    const prop = ws?.properties.find(p => p.id === editCell.propId);
    if (!prop) return;

    let parsedValue: unknown = editCell.value;
    if (prop.type === "CHECKBOX") parsedValue = editCell.value === "true";
    if (prop.type === "NUMBER") parsedValue = parseFloat(editCell.value) || 0;

    const entry = ws?.entries.find(e => e.uuid === editCell.entryUuid);
    if (!entry) return;

    await api.patch(`/workspace/${uuid}/entries/${editCell.entryUuid}`, {
      data: { ...entry.data, [String(editCell.propId)]: parsedValue },
    }).catch(() => {});
    setEditCell(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading workspace...
      </div>
    );
  }

  if (!ws) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/workspace")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <span className="text-2xl">{ws.icon ?? "📋"}</span>
        <h1 className="text-xl font-bold text-gray-900">{ws.name}</h1>
        <div className="ml-auto flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowProp(true)}>
              <Settings className="h-4 w-4 mr-1" />Add Property
            </Button>
          )}
          <Button size="sm" onClick={() => setShowEntry(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Entry
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
        {ws.entries.length === 0 && ws.properties.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No properties yet.</p>
            {isAdmin && <p className="text-sm mt-1">Add properties to define columns, then add entries.</p>}
          </div>
        ) : (
          <table className="w-full text-sm min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[200px]">Title</th>
                {ws.properties.map(p => (
                  <th key={p.id} className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      <Badge variant="outline" className="text-[10px] font-normal">{p.type}</Badge>
                      {isAdmin && (
                        <button onClick={() => deleteProp(p.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ws.entries.length === 0 ? (
                <tr>
                  <td colSpan={ws.properties.length + 2} className="text-center py-10 text-gray-400">
                    No entries yet. Click &quot;Add Entry&quot; to add data.
                  </td>
                </tr>
              ) : (
                ws.entries.map(entry => (
                  <tr key={entry.uuid} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.title}</td>
                    {ws.properties.map(prop => {
                      const val = entry.data[String(prop.id)];
                      const isEditing = editCell?.entryUuid === entry.uuid && editCell.propId === prop.id;

                      return (
                        <td key={prop.id} className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Input
                                autoFocus
                                className="h-7 text-xs py-0"
                                value={editCell.value}
                                onChange={e => setEditCell(c => c ? { ...c, value: e.target.value } : null)}
                                onKeyDown={e => { if (e.key === "Enter") saveCell(); if (e.key === "Escape") setEditCell(null); }}
                              />
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={saveCell}>✓</Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-indigo-50 rounded px-1 -mx-1 min-h-[20px]"
                              onClick={() => setEditCell({ entryUuid: entry.uuid, propId: prop.id, value: val != null ? String(val) : "" })}
                            >
                              <CellValue type={prop.type} value={val} options={prop.options} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteEntry(entry.uuid)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showProp && (
        <AddPropertyModal wsUuid={uuid} onAdded={load} onClose={() => setShowProp(false)} />
      )}
      {showEntry && (
        <AddEntryModal wsUuid={uuid} properties={ws.properties} onAdded={load} onClose={() => setShowEntry(false)} />
      )}
    </div>
  );
}
