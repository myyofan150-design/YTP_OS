"use client";

interface NoteContentExcerptProps {
  content: string;
  maxChars?: number;
}

export function NoteContentExcerpt({ content, maxChars = 150 }: NoteContentExcerptProps) {
  const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const truncated = plain.length > maxChars ? plain.slice(0, maxChars) + "…" : plain;
  return (
    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
      {truncated}
    </span>
  );
}
