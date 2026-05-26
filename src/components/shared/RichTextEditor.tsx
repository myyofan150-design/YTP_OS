"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

interface Props {
  value: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

function ToolBtn({
  onClick, active, title, children,
}: { onClick: () => void; active: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded transition-all"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color:      active ? "#000"          : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, editable = true, placeholder = "Add remarks…" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. form reset or initial load)
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.getHTML();
    if (current !== value) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editable) {
    return (
      <div
        className="prose prose-sm max-w-none text-sm"
        style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{ __html: value || "<p style='color:var(--text-secondary)'>No remarks</p>" }}
      />
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
      >
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()}         active={editor?.isActive("bold")        ?? false} title="Bold">        <Bold        size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()}       active={editor?.isActive("italic")      ?? false} title="Italic">      <Italic      size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}   active={editor?.isActive("bulletList")  ?? false} title="Bullet list"> <List        size={13} /></ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()}  active={editor?.isActive("orderedList") ?? false} title="Ordered list"><ListOrdered size={13} /></ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-3 py-2 text-sm"
        style={{ color: "var(--text-primary)" }}
      />
    </div>
  );
}
