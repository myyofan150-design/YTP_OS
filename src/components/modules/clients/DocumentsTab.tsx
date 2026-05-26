"use client";

// src/components/modules/clients/DocumentsTab.tsx
// Lists uploaded documents. Allows uploading and deleting.

import { useState, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClientDocument } from "@/types";

function FileTypeIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();

  if (e === "pdf") {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#FEE2E2" />
        <path d="M6 4h8l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" fill="#EF4444" opacity="0.2"/>
        <path d="M14 4l4 4h-4V4z" fill="#EF4444" opacity="0.5"/>
        <text x="4" y="18" fontSize="7" fontWeight="700" fill="#DC2626" fontFamily="Arial,sans-serif">PDF</text>
      </svg>
    );
  }

  if (e === "doc" || e === "docx") {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#DBEAFE" />
        <path d="M6 4h8l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" fill="#3B82F6" opacity="0.2"/>
        <path d="M14 4l4 4h-4V4z" fill="#3B82F6" opacity="0.5"/>
        <text x="3" y="18" fontSize="6" fontWeight="700" fill="#1D4ED8" fontFamily="Arial,sans-serif">DOC</text>
      </svg>
    );
  }

  if (e === "xls" || e === "xlsx") {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#DCFCE7" />
        <path d="M6 4h8l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" fill="#22C55E" opacity="0.2"/>
        <path d="M14 4l4 4h-4V4z" fill="#22C55E" opacity="0.5"/>
        <text x="4" y="18" fontSize="6.5" fontWeight="700" fill="#15803D" fontFamily="Arial,sans-serif">XLS</text>
      </svg>
    );
  }

  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(e)) {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="4" fill="#F3E8FF" />
        <rect x="4" y="6" width="16" height="12" rx="2" fill="#A855F7" opacity="0.2"/>
        <circle cx="9" cy="10" r="1.5" fill="#A855F7" opacity="0.7"/>
        <path d="M4 15l4-4 3 3 2-2 4 4H4z" fill="#A855F7" opacity="0.6"/>
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="#A855F7" strokeWidth="1.2"/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#F1F5F9" />
      <path d="M6 4h8l4 4v12a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" fill="#94A3B8" opacity="0.3"/>
      <path d="M14 4l4 4h-4V4z" fill="#94A3B8" opacity="0.5"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="13" y2="16" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

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
                <FileTypeIcon ext={doc.fileType} />
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
