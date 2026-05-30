"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  previewUrl?: string | null;
  onClear?: () => void;
  label?: string;
  hint?: string;
  imagePreview?: boolean;
  className?: string;
}

export function DropZone({
  onFile,
  accept,
  previewUrl,
  onClear,
  label = "Drag & drop or click to browse",
  hint,
  imagePreview = false,
  className,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }, [onFile]);

  if (previewUrl && imagePreview) {
    return (
      <div className={cn("relative inline-flex", className)}>
        <img
          src={previewUrl}
          alt="preview"
          className="h-16 w-16 rounded-xl object-cover border border-border"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <button
          type="button"
          onClick={() => { onClear?.(); }}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px]"
        >
          <X size={9} />
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border shadow-sm"
          title="Change image"
        >
          <Upload size={9} />
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors select-none",
        "px-4 py-5 text-center",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
        className,
      )}
    >
      {previewUrl && !imagePreview ? (
        <div className="flex items-center gap-2 w-full">
          <FileText size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">{previewUrl}</span>
          {onClear && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClear(); }}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            {imagePreview ? (
              <Image size={16} className="text-muted-foreground" />
            ) : (
              <Upload size={16} className="text-muted-foreground" />
            )}
          </div>
          <p className="text-xs font-medium text-foreground">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  );
}
