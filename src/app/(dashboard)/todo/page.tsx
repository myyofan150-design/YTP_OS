"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckSquare, Plus } from "lucide-react";
import { SmartViewPanel } from "@/components/modules/todo/SmartViewPanel";
import { ListDetailPanel } from "@/components/modules/todo/ListDetailPanel";
import { NewListDialog } from "@/components/modules/todo/NewListDialog";
import type { SmartViewType, TodoList } from "@/types";

const SMART_VIEWS: SmartViewType[] = ["today", "important", "assigned-to-me", "overdue", "completed"];

function WelcomeScreen({ onNewList }: { onNewList: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "rgba(3,255,148,0.08)", border: "1px solid rgba(3,255,148,0.2)" }}>
        <CheckSquare size={36} style={{ color: "#03ff94" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Your to-do lists will appear here</h2>
        <p className="text-sm text-muted-foreground mt-1">Create a list to start organising your tasks</p>
      </div>
      <button
        onClick={onNewList}
        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/85 transition-colors"
      >
        <Plus size={16} /> Create a List
      </button>
    </div>
  );
}

function TodoPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const view         = searchParams.get("view") as SmartViewType | null;
  const listUuid     = searchParams.get("listUuid");

  const [newListOpen, setNewListOpen] = useState(false);

  function handleListCreated(list: TodoList) {
    router.push(`/todo?listUuid=${list.uuid}`);
  }

  const content = (() => {
    if (listUuid) return <ListDetailPanel listUuid={listUuid} />;
    if (view && SMART_VIEWS.includes(view)) return <SmartViewPanel view={view} />;
    return <WelcomeScreen onNewList={() => setNewListOpen(true)} />;
  })();

  return (
    <div className="flex flex-col h-full">
      {content}

      <NewListDialog
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        onCreated={handleListCreated}
      />
    </div>
  );
}

export default function TodoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground pt-8 text-center">Loading…</p>}>
      <TodoPageInner />
    </Suspense>
  );
}
