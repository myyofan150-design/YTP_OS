"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import api from "@/lib/api";
import { LeadCard } from "./LeadCard";
import type { Lead, LeadMetaOption } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  status:  LeadMetaOption;
  leads:   Lead[];
}

interface Props {
  leads:    Lead[];
  statuses: LeadMetaOption[];
  onLeadClick: (lead: Lead) => void;
  onLeadsChange: (leads: Lead[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildColumns(leads: Lead[], statuses: LeadMetaOption[]): Column[] {
  const cols: Column[] = statuses.map(s => ({ status: s, leads: [] }));
  const unstatused: Lead[] = [];

  for (const lead of leads) {
    const col = cols.find(c => c.status.id === lead.statusId);
    if (col) col.leads.push(lead);
    else unstatused.push(lead);
  }

  // Insert any unstatused leads into first column, or a fallback "No Status" column
  if (unstatused.length > 0) {
    if (cols.length > 0) cols[0].leads.push(...unstatused);
  }

  return cols;
}

// ─── LeadKanbanBoard ──────────────────────────────────────────────────────────

export function LeadKanbanBoard({ leads, statuses, onLeadClick, onLeadsChange }: Props) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  // Sync external leads into local state when prop changes
  if (leads !== localLeads && JSON.stringify(leads) !== JSON.stringify(localLeads)) {
    setLocalLeads(leads);
  }

  const columns = buildColumns(localLeads, statuses);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatusId = Number(destination.droppableId);
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    // Optimistic update
    const updated = localLeads.map(l =>
      l.uuid === draggableId
        ? { ...l, statusId: newStatusId, status: newStatus }
        : l
    );
    setLocalLeads(updated);
    onLeadsChange(updated);

    try {
      await api.patch(`/leads/${draggableId}`, { statusId: newStatusId });
    } catch {
      toast.error("Failed to update status");
      setLocalLeads(leads);
      onLeadsChange(leads);
    }
  }, [localLeads, leads, statuses, onLeadsChange]);

  if (statuses.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No statuses configured. Add statuses in Lead Meta Manager.
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {columns.map(col => (
          <div key={col.status.id} className="flex flex-col gap-2 min-w-[240px] w-[240px] shrink-0">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.status.color }} />
              <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                {col.status.label}
              </span>
              <span className="text-xs font-medium rounded-full px-1.5 py-0.5"
                style={{ background: `${col.status.color}18`, color: col.status.color }}>
                {col.leads.length}
              </span>
            </div>

            <Droppable droppableId={String(col.status.id)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-2 rounded-xl p-2 min-h-[120px] flex-1 transition-colors"
                  style={{
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
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                          style={{
                            ...drag.draggableProps.style,
                            opacity: dragSnap.isDragging ? 0.85 : 1,
                            transform: dragSnap.isDragging
                              ? `${drag.draggableProps.style?.transform ?? ""} rotate(1.5deg)`
                              : drag.draggableProps.style?.transform,
                          }}
                        >
                          <LeadCard lead={lead} onClick={() => onLeadClick(lead)} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {col.leads.length === 0 && !snapshot.isDraggingOver && (
                    <p className="text-center py-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                      Drop here
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
