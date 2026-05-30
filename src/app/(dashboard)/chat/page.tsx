"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ConversationListPanel } from "@/components/modules/chat/ConversationListPanel";
import { MessageViewPanel }      from "@/components/modules/chat/MessageViewPanel";
import { NewDirectChatDialog }   from "@/components/modules/chat/NewDirectChatDialog";
import { NewGroupDialog }        from "@/components/modules/chat/NewGroupDialog";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

function ChatPageInner() {
  const { user }   = useAuth();
  const router     = useRouter();
  const params     = useSearchParams();
  const activeUuid = params.get("c");

  const [showNewDirect, setShowNewDirect] = useState(false);
  const [showNewGroup,  setShowNewGroup]  = useState(false);

  function navigate(uuid: string) {
    router.push(`/chat?c=${uuid}`);
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl" style={{ border: "1px solid #e9edef" }}>

      {/* ── Conversation list ── */}
      <div
        className={`shrink-0 flex flex-col${activeUuid ? " hidden md:flex" : " flex"}`}
        style={{ width: "340px", borderRight: "1px solid #e9edef", background: "#ffffff" }}
      >
        <ConversationListPanel
          activeUuid={activeUuid}
          onSelect={navigate}
          onNewDirect={() => setShowNewDirect(true)}
          onNewGroup={() => setShowNewGroup(true)}
          userRole={user?.role ?? ""}
        />
      </div>

      {/* ── Message view ── */}
      <div className={`flex-1 min-w-0 flex flex-col${activeUuid ? " flex" : " hidden md:flex"}`}
        style={{ background: "#f0f2f5" }}>
        {activeUuid ? (
          <MessageViewPanel
            key={activeUuid}
            conversationUuid={activeUuid}
            onBack={() => router.push("/chat")}
            currentUserId={user?.id ?? 0}
            currentUserRole={user?.role ?? ""}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "rgba(0,191,165,0.1)" }}
            >
              <span className="text-4xl">💬</span>
            </div>
            <p className="text-[15px] font-medium" style={{ color: "#667781" }}>
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      {showNewDirect && (
        <NewDirectChatDialog
          onClose={() => setShowNewDirect(false)}
          onCreated={navigate}
        />
      )}
      {showNewGroup && ADMIN_ROLES.includes(user?.role ?? "") && (
        <NewGroupDialog
          onClose={() => setShowNewGroup(false)}
          onCreated={navigate}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
