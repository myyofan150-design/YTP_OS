"use client";

// src/components/modules/clients/DocumentsTab.tsx
// Lists uploaded documents. Allows uploading and deleting.

import { useState, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientDocument } from "@/types";

const FILE_ICONS: Record<string, string> = {
  pdf:  "📄",
  docx: "📝",
  xlsx: "📊",
  png:  "🖼️",
  jpg:  "🖼️",
  jpeg: "🖼️",
};

interface Props {
  uuid: string;
  documents: ClientDocument[];
  canEdit: boolean;
  onRefresh: () => void;
}

export function DocumentsTab({ uuid, documents, canEdit, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (docName) fd.append("name", docName);
      await api.post(`/clients/${uuid}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      setDocName("");
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
      onRefresh();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: number, name: string) {
    if (!confirm(`Delete document "${name}"?`)) return;
    try {
      await api.delete(`/clients/${uuid}/documents/${docId}`);
      onRefresh();
    } catch {
      // ignore — user sees stale list
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  const apiBase = process.env["NEXT_PUBLIC_API_URL"]?.replace("/api", "") ?? "http://localhost:5000";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
        {canEdit && !showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white"
          >
            + Upload Document
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleUpload} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Upload Document</p>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Display Name (optional)</Label>
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Leave blank to use filename"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">File *</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs text-slate-600 file:mr-3 file:h-8 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              required
            />
            <p className="text-[11px] text-slate-400">Allowed: PDF, PNG, JPG, DOCX, XLSX — max 10 MB</p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={uploading || !file} size="sm" className="h-8 text-xs bg-[#0F172A] hover:bg-slate-700 text-white">
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{FILE_ICONS[doc.fileType] ?? "📎"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-400">{doc.fileType.toUpperCase()} · {formatDate(doc.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`${apiBase}/${doc.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View
                </a>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
