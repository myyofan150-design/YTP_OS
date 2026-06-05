"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import { SmartViewPanel }  from "@/components/modules/todo/SmartViewPanel";
import { ListDetailPanel } from "@/components/modules/todo/ListDetailPanel";
import { TodoNav }         from "@/components/modules/todo/TodoNav";
import type { SmartViewType } from "@/types";

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onNewList }: { onNewList: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ background: "rgba(3,255,148,0.08)", border: "1px solid rgba(3,255,148,0.2)" }}>
        <CheckCircle2 size={36} style={{ color: "#03ff94" }} />
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

// ─── Inner page (needs Suspense for useSearchParams) ─────────────────────────

function TodoPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const view         = searchParams.get("view") as SmartViewType | null;
  const listUuid     = searchParams.get("listUuid");
  const [refreshKey, setRefreshKey] = useState(0);

  const content = (() => {
    if (listUuid) return <ListDetailPanel key={listUuid} listUuid={listUuid} />;
    if (view)     return <SmartViewPanel  key={view}     view={view} />;
    return <WelcomeScreen onNewList={() => router.push("/todo?view=today")} />;
  })();

  return (
    <div className="flex h-full overflow-hidden -m-6">
      {/* Left nav */}
      <TodoNav
        activeView={view}
        activeListUuid={listUuid}
        onRefresh={() => setRefreshKey(k => k + 1)}
      />

      {/* Right content */}
      <div key={refreshKey} className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {content}
      </div>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function TodoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground pt-8 text-center">Loading…</p>}>
      <TodoPageInner />
    </Suspense>
  );
}
