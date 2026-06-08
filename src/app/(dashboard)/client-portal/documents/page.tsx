"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, File } from "lucide-react";

interface Doc {
  id: number;
  name: string;
  filePath: string;
  fileType: string;
  createdAt: string;
}

function fileIcon(fileType: string) {
  if (fileType.includes("pdf")) return "#ef4444";
  if (fileType.includes("image")) return "#6366f1";
  if (fileType.includes("word") || fileType.includes("doc")) return "#3b82f6";
  return "#64748b";
}

export default function ClientPortalDocumentsPage() {
  const [docs, setDocs]       = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/client-portal/documents");
      setDocs(r.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="card-hover animate-fade-up rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={36} className="text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map(doc => (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${fileIcon(doc.fileType)}18` }}>
                  <File size={18} style={{ color: fileIcon(doc.fileType) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {" · "}{doc.fileType}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 px-3 gap-1 text-xs shrink-0">
                  <a href={doc.filePath} target="_blank" rel="noopener noreferrer" download>
                    <Download size={12} /> Download
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
