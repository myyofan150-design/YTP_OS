"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DragDropContext, Droppable, Draggable, DropResult,
  type DraggableProvided, type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { LeadCard } from "./LeadCard";
import type { Lead, LeadMetaOption } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column { status: LeadMetaOption; leads: Lead[] }

interface Props {
  leads:         Lead[];
  statuses:      LeadMetaOption[];
  onLeadClick:   (lead: Lead) => void;
  onLeadsChange: (leads: Lead[]) => void;
}

interface PendingMove {
  lead:         Lead;
  targetStatus: LeadMetaOption;
}

// ─── Status-transition helpers ────────────────────────────────────────────────

const lbl = (s: LeadMetaOption | null | undefined) =>
  (s?.label ?? "").toLowerCase().trim();

function isTerminal(s: LeadMetaOption | null | undefined): boolean {
  return lbl(s) === "won" || lbl(s) === "blacklist";
}

function isBlacklist(s: LeadMetaOption | null | undefined): boolean {
  return lbl(s) === "blacklist";
}

function isWon(s: LeadMetaOption | null | undefined): boolean {
  return lbl(s) === "won";
}

function isLost(s: LeadMetaOption | null | undefined): boolean {
  return lbl(s) === "lost";
}

/** Returns true if the drag is allowed; false if it must be blocked entirely. */
function canMove(current: LeadMetaOption | null, target: LeadMetaOption): boolean {
  if (!current || current.id === target.id) return false;
  if (isTerminal(current)) return false;                    // Won/Blacklist: locked
  if (isBlacklist(target)) return true;                     // To blacklist: allowed (confirmed separately)
  if (isLost(current))     return lbl(target) === "contacted"; // Lost → Contacted only
  if (isLost(target))      return true;                     // Anything → Lost allowed
  return target.sortOrder > current.sortOrder;              // Forward only
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildColumns(leads: Lead[], statuses: LeadMetaOption[]): Column[] {
  const cols: Column[] = statuses.map(s => ({ status: s, leads: [] }));
  for (const lead of leads) {
    const col = cols.find(c => c.status.id === lead.statusId);
    if (col) col.leads.push(lead);
    else if (cols.length > 0) cols[0].leads.push(lead);
  }
  return cols;
}

// ─── BlacklistConfirmDialog ────────────────────────────────────────────────────

function BlacklistConfirmDialog({
  lead, onConfirm, onCancel,
}: { lead: Lead; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Blacklist this lead?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <strong>{lead.contactPerson}</strong> will be permanently blacklisted and cannot be moved to any other status.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-8 px-4 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-8 px-4 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Yes, Blacklist
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Portal-aware draggable card ─────────────────────────────────────────────
// Renders the dragging ghost as a direct child of document.body so it escapes
// any scrollable ancestor or CSS transform containing-block, which would
// otherwise make position:fixed drift away from the cursor.

function DraggableCard({
  drag,
  dragSnap,
  lead,
  onLeadClick,
}: {
  drag:       DraggableProvided;
  dragSnap:   DraggableStateSnapshot;
  lead:       Lead;
  onLeadClick: (lead: Lead) => void;
}) {
  const el = (
    <div
      ref={drag.innerRef}
      {...drag.draggableProps}
      {...drag.dragHandleProps}
      className="shrink-0 w-[220px]"
      style={{
        ...drag.draggableProps.style,
        opacity: dragSnap.isDragging ? 0.85 : 1,
        transform: dragSnap.isDragging
          ? `${drag.draggableProps.style?.transform ?? ""} rotate(1.5deg)`
          : drag.draggableProps.style?.transform,
        cursor: dragSnap.isDragging ? "grabbing" : "grab",
      }}
    >
      <LeadCard lead={lead} onClick={() => onLeadClick(lead)} kanban />
    </div>
  );

  // While dragging, portal to body — escapes scroll containers & transforms
  if (dragSnap.isDragging && typeof document !== "undefined") {
    return createPortal(el, document.body);
  }
  return el;
}

// ─── LeadKanbanBoard ──────────────────────────────────────────────────────────

export function LeadKanbanBoard({ leads, statuses, onLeadClick, onLeadsChange }: Props) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  // Sync external leads
  if (leads !== localLeads && JSON.stringify(leads) !== JSON.stringify(localLeads)) {
    setLocalLeads(leads);
  }

  const columns = buildColumns(localLeads, statuses);

  const commitMove = useCallback(async (lead: Lead, targetStatus: LeadMetaOption) => {
    const previousStatus = lead.status;
    const previousStatusId = lead.statusId;

    const updated = localLeads.map(l =>
      l.uuid === lead.uuid ? { ...l, statusId: targetStatus.id, status: targetStatus } : l
    );
    setLocalLeads(updated);
    onLeadsChange(updated);

    try {
      await api.patch(`/leads/${lead.uuid}`, { statusId: targetStatus.id });

      if (isBlacklist(targetStatus)) {
        toast.success(`${lead.contactPerson} has been blacklisted`, {
          duration: 10000,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await api.patch(`/leads/${lead.uuid}`, { statusId: previousStatusId });
                const reverted = updated.map(l =>
                  l.uuid === lead.uuid
                    ? { ...l, statusId: previousStatusId ?? null, status: previousStatus }
                    : l
                );
                setLocalLeads(reverted);
                onLeadsChange(reverted);
                toast.success("Blacklist undone");
              } catch {
                toast.error("Undo failed — please refresh");
              }
            },
          },
        });
      }
    } catch {
      toast.error("Failed to update status");
      setLocalLeads(leads);
      onLeadsChange(leads);
    }
  }, [localLeads, leads, onLeadsChange]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatusId  = Number(destination.droppableId);
    const targetStatus = statuses.find(s => s.id === newStatusId);
    if (!targetStatus) return;

    const lead = localLeads.find(l => l.uuid === draggableId);
    if (!lead) return;

    // Check if move is allowed
    if (!canMove(lead.status, targetStatus)) {
      if (isTerminal(lead.status)) {
        toast.error(`This lead is ${isWon(lead.status) ? "won" : "blacklisted"} and cannot be moved.`);
      } else if (isLost(lead.status)) {
        toast.error("Lost leads can only be moved back to Contacted.");
      } else {
        toast.error("Leads cannot move backwards in the pipeline.");
      }
      return;
    }

    // Blacklist: show confirmation dialog (card snaps back, committed after confirm)
    if (isBlacklist(targetStatus)) {
      setPendingMove({ lead, targetStatus });
      return;
    }

    commitMove(lead, targetStatus);
  }, [localLeads, statuses, commitMove]);

  if (statuses.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">
          No statuses configured. Add statuses in Lead Meta Manager.
        </p>
      </div>
    );
  }

  return (
    <>
      {pendingMove && (
        <BlacklistConfirmDialog
          lead={pendingMove.lead}
          onConfirm={() => {
            const { lead, targetStatus } = pendingMove;
            setPendingMove(null);
            commitMove(lead, targetStatus);
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-3 w-full">
          {columns.map(col => {
            const isBlacklistCol = isBlacklist(col.status);
            const isWonCol       = isWon(col.status);
            return (
              <div key={col.status.id} className="w-full">
                {/* Row header */}
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: col.status.color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {col.status.label}
                  </span>
                  <span
                    className="text-xs font-medium rounded-full px-1.5 py-0.5"
                    style={{ background: `${col.status.color}18`, color: col.status.color }}
                  >
                    {col.leads.length}
                  </span>
                  {(isBlacklistCol || isWonCol) && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1"
                      style={{
                        background: isBlacklistCol ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                        color: isBlacklistCol ? "#EF4444" : "#22C55E",
                      }}>
                      {isBlacklistCol ? "Terminal — no exit" : "Locked — converted"}
                    </span>
                  )}
                </div>

                {/* Droppable horizontal row — scroll wrapper is OUTSIDE the droppable
                    ref so @hello-pangea/dnd doesn't try to track its scroll offset */}
                <div className="overflow-x-auto rounded-xl">
                  <Droppable droppableId={String(col.status.id)} direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex flex-row gap-2 p-2 min-h-[100px] transition-colors"
                        style={{
                          minWidth: "max-content",
                          borderRadius: "inherit",
                          background: snapshot.isDraggingOver
                            ? `${col.status.color}0A`
                            : "var(--bg-elevated)",
                          border: snapshot.isDraggingOver
                            ? `1px solid ${col.status.color}40`
                            : "1px solid var(--border)",
                        }}
                      >
                        {col.leads.map((lead, index) => (
                          <Draggable key={lead.uuid} draggableId={lead.uuid} index={index}>
                            {(drag, dragSnap) => (
                              <DraggableCard
                                drag={drag}
                                dragSnap={dragSnap}
                                lead={lead}
                                onLeadClick={onLeadClick}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {col.leads.length === 0 && !snapshot.isDraggingOver && (
                          <p className="flex items-center px-4 text-xs text-muted-foreground italic">
                            No leads
                          </p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
}
