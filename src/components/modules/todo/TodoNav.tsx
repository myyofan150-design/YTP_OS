"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DragUpdate, type DraggableProvided,
} from "@hello-pangea/dnd";
import {
  CalendarDays, Star, UserCheck, AlertCircle, CheckCircle2,
  ListTodo, Plus, ChevronDown, ChevronRight, FolderOpen,
  GripVertical, MoreHorizontal, Pencil, Trash2,
  FolderInput, FolderMinus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { NewListDialog }  from "./NewListDialog";
import { NewGroupDialog } from "./NewGroupDialog";
import type { TodoGroup, TodoList } from "@/types";

// ─── Smart views ──────────────────────────────────────────────────────────────

export const SMART_VIEWS = [
  { view: "today",          label: "Today",          Icon: CalendarDays  },
  { view: "important",      label: "Important",      Icon: Star          },
  { view: "assigned-to-me", label: "Assigned to Me", Icon: UserCheck     },
  { view: "overdue",        label: "Overdue",        Icon: AlertCircle   },
  { view: "completed",      label: "Completed",      Icon: CheckCircle2  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  activeView:     string | null;
  activeListUuid: string | null;
  onRefresh:      () => void;
}

export function TodoNav({ activeView, activeListUuid, onRefresh }: Props) {
  const router = useRouter();

  const [groups,       setGroups]       = useState<TodoGroup[]>([]);
  const [lists,        setLists]        = useState<TodoList[]>([]);
  const [openGroups,   setOpenGroups]   = useState<Set<number>>(new Set());
  const [newListOpen,  setNewListOpen]  = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  // Rename state for group inline edit
  const [renamingUuid, setRenamingUuid] = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState("");

  // Track which group is being dragged over (to auto-expand)
  const [dragOverGroupUuid, setDragOverGroupUuid] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(() => {
    api.get("/todo/groups").then(r => setGroups(r.data.data ?? [])).catch(() => {});
    api.get("/todo/lists").then(r  => setLists(r.data.data  ?? [])).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-open group containing active list
  useEffect(() => {
    if (!activeListUuid) return;
    const active = lists.find(l => l.uuid === activeListUuid);
    if (active?.groupId) {
      setOpenGroups(prev => new Set([...prev, active.groupId!]));
    }
  }, [activeListUuid, lists]);

  function toggleGroup(id: number) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDragUpdate(update: DragUpdate) {
    const destId = update.destination?.droppableId;
    setDragOverGroupUuid(destId?.startsWith("grp:") ? destId.slice(4) : null);
  }

  function handleDragEnd(result: DropResult) {
    setDragOverGroupUuid(null);

    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === "GROUP") {
      const prev      = groups;
      const newGroups = reorderArray(groups, source.index, destination.index);
      setGroups(newGroups);

      api.patch("/todo/groups/reorder", {
        groups: newGroups.map((g, i) => ({ uuid: g.uuid, sortOrder: i })),
      }).catch(() => { setGroups(prev); toast.error("Failed to reorder groups"); });
      return;
    }

    if (type === "LIST") {
      const srcId = source.droppableId;       // "grp:{uuid}" or "ungrouped"
      const dstId = destination.droppableId;

      const srcGroupUuid = srcId.startsWith("grp:") ? srcId.slice(4) : null;
      const dstGroupUuid = dstId.startsWith("grp:") ? dstId.slice(4) : null;

      const srcGroup   = srcGroupUuid ? (groups.find(g => g.uuid === srcGroupUuid) ?? null) : null;
      const dstGroup   = dstGroupUuid ? (groups.find(g => g.uuid === dstGroupUuid) ?? null) : null;
      const srcGroupId = srcGroup?.id ?? null;
      const dstGroupId = dstGroup?.id ?? null;

      // Get ordered items per bucket
      const listsInSrc = lists.filter(l => (l.groupId ?? null) === srcGroupId);
      const listsInDst = srcGroupId === dstGroupId
        ? listsInSrc
        : lists.filter(l => (l.groupId ?? null) === dstGroupId);

      const dragged = listsInSrc[source.index];
      if (!dragged) return;

      const prevLists = lists;

      if (srcGroupId === dstGroupId) {
        // Same bucket – reorder only
        const bucket   = reorderArray(listsInSrc, source.index, destination.index);
        const newLists = [
          ...lists.filter(l => (l.groupId ?? null) !== srcGroupId),
          ...bucket.map((l, i) => ({ ...l, sortOrder: i })),
        ];
        setLists(newLists);

        api.patch("/todo/lists/reorder", {
          lists: bucket.map((l, i) => ({
            uuid: l.uuid,
            sortOrder: i,
            groupId: srcGroup?.uuid ?? null,
          })),
        }).catch(() => { setLists(prevLists); toast.error("Failed to reorder"); });
      } else {
        // Different bucket – move list
        if (dstGroup) setOpenGroups(prev => new Set([...prev, dstGroup.id]));

        const newSrc = listsInSrc.filter((_, i) => i !== source.index);
        const newDst = [...listsInDst];
        newDst.splice(destination.index, 0, { ...dragged, groupId: dstGroupId });

        const other = lists.filter(l => {
          const gid = l.groupId ?? null;
          return gid !== srcGroupId && gid !== dstGroupId;
        });

        const newLists = [
          ...other,
          ...newSrc.map((l, i) => ({ ...l, sortOrder: i })),
          ...newDst.map((l, i) => ({ ...l, groupId: dstGroupId, sortOrder: i })),
        ];
        setLists(newLists);

        api.patch("/todo/lists/reorder", {
          lists: [
            ...newSrc.map((l, i) => ({ uuid: l.uuid, sortOrder: i, groupId: srcGroup?.uuid ?? null })),
            ...newDst.map((l, i) => ({ uuid: l.uuid, sortOrder: i, groupId: dstGroup?.uuid ?? null })),
          ],
        }).catch(() => { setLists(prevLists); toast.error("Failed to move list"); });
      }
    }
  }

  // ── Group actions ──────────────────────────────────────────────────────────

  function startRename(group: TodoGroup) {
    setRenamingUuid(group.uuid);
    setRenameValue(group.name);
  }

  async function commitRename(uuid: string) {
    const val = renameValue.trim();
    setRenamingUuid(null);
    if (!val) return;
    const prev = groups;
    setGroups(gs => gs.map(g => g.uuid === uuid ? { ...g, name: val } : g));
    try {
      await api.patch(`/todo/groups/${uuid}`, { name: val });
    } catch {
      setGroups(prev);
      toast.error("Failed to rename group");
    }
  }

  async function deleteGroup(group: TodoGroup) {
    const prevGroups = groups;
    const prevLists  = lists;
    // Optimistic: remove group, ungroup its lists
    setGroups(gs => gs.filter(g => g.uuid !== group.uuid));
    setLists(ls => ls.map(l => l.groupId === group.id ? { ...l, groupId: null } : l));
    try {
      await api.delete(`/todo/groups/${group.uuid}`);
      toast.success(`"${group.name}" deleted`);
    } catch {
      setGroups(prevGroups);
      setLists(prevLists);
      toast.error("Failed to delete group");
    }
  }

  // ── List move action ───────────────────────────────────────────────────────

  async function moveListToGroup(list: TodoList, targetGroupUuid: string | null) {
    const targetGroup   = targetGroupUuid ? (groups.find(g => g.uuid === targetGroupUuid) ?? null) : null;
    const targetGroupId = targetGroup?.id ?? null;
    const prevLists     = lists;

    setLists(ls => ls.map(l => l.uuid === list.uuid ? { ...l, groupId: targetGroupId } : l));
    if (targetGroup) setOpenGroups(prev => new Set([...prev, targetGroup.id]));

    try {
      await api.patch(`/todo/lists/${list.uuid}`, { groupId: targetGroupUuid });
    } catch {
      setLists(prevLists);
      toast.error("Failed to move list");
    }
  }

  // ── Rendering helpers ──────────────────────────────────────────────────────

  const ungroupedLists = lists.filter(l => (l.groupId ?? null) === null);

  function renderListItem(list: TodoList, drag: DraggableProvided, inGroup: boolean) {
    const active = activeListUuid === list.uuid;
    return (
      <div
        ref={drag.innerRef}
        {...drag.draggableProps}
        className={inGroup ? "group/list" : "group/ulist"}
      >
        <div className={`flex items-center gap-0.5 transition-colors ${
          inGroup ? "rounded-lg" : "rounded-xl"
        } ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}>

          {/* Drag handle */}
          <span
            {...drag.dragHandleProps}
            className={`pl-1 flex items-center shrink-0 opacity-0 cursor-grab active:cursor-grabbing transition-opacity ${
              inGroup ? "group-hover/list:opacity-40" : "group-hover/ulist:opacity-40"
            }`}
          >
            <GripVertical className="w-3 h-3" />
          </span>

          {/* List link */}
          <Link
            href={`/todo?listUuid=${list.uuid}`}
            className={`flex items-center gap-1.5 flex-1 min-w-0 py-1.5 ${inGroup ? "pr-1" : "px-2"}`}
          >
            {!inGroup && (
              <ListTodo
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: active ? "inherit" : (list.color ?? "#6366F1") }}
              />
            )}
            {inGroup && (
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: list.color ?? "#6366F1" }} />
            )}
            <span className="flex-1 text-xs font-medium truncate">{list.name}</span>
            {(list.taskCount ?? 0) > 0 && (
              <span className="text-[10px] font-normal opacity-60">{list.taskCount}</span>
            )}
          </Link>

          {/* Context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground mr-0.5 opacity-0 transition-opacity ${
                inGroup ? "group-hover/list:opacity-100" : "group-hover/ulist:opacity-100"
              }`}
            >
              <MoreHorizontal className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {groups.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
                    <FolderInput className="w-3 h-3" /> Move to group
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {groups
                      .filter(g => g.id !== list.groupId)
                      .map(g => (
                        <DropdownMenuItem
                          key={g.uuid}
                          onClick={() => moveListToGroup(list, g.uuid)}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: g.color }} />
                          {g.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {(list.groupId ?? null) !== null && (
                <DropdownMenuItem
                  onClick={() => moveListToGroup(list, null)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <FolderMinus className="w-3 h-3" /> Remove from group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">

        {/* Smart views */}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5 mt-1">
          Smart Views
        </p>
        {SMART_VIEWS.map(({ view, label, Icon }) => {
          const active = activeView === view && !activeListUuid;
          return (
            <Link
              key={view}
              href={`/todo?view=${view}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-border" />

        {/* My Lists header */}
        <div className="flex items-center justify-between px-2 mb-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            My Lists
          </p>
          <button
            onClick={() => setNewGroupOpen(true)}
            title="New Group"
            className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
          </button>
        </div>

        {/* ── DnD context ─────────────────────────────────────────────────── */}
        <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>

          {/* Groups droppable (for reordering groups themselves) */}
          <Droppable droppableId="groups" type="GROUP">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>

                {groups.map((group, groupIndex) => {
                  const groupLists = lists.filter(l => l.groupId === group.id);
                  const isOpen     = openGroups.has(group.id);
                  const isRenaming = renamingUuid === group.uuid;
                  const isDraggedOver = dragOverGroupUuid === group.uuid;
                  // Show contents when open OR when a list is being dragged over this group
                  const showContents = isOpen || isDraggedOver;

                  return (
                    <Draggable key={group.uuid} draggableId={`group:${group.uuid}`} index={groupIndex}>
                      {(drag) => (
                        <div ref={drag.innerRef} {...drag.draggableProps}>

                          {/* Group header */}
                          <div className="group/grp flex items-center gap-0.5 px-1 py-1 rounded-lg hover:bg-muted/60 transition-colors">

                            {/* Group drag handle */}
                            <span
                              {...drag.dragHandleProps}
                              className="flex items-center shrink-0 opacity-0 group-hover/grp:opacity-40 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-3 h-3" />
                            </span>

                            {/* Name / inline rename input */}
                            {isRenaming ? (
                              <Input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onBlur={() => commitRename(group.uuid)}
                                onKeyDown={e => {
                                  if (e.key === "Enter")  commitRename(group.uuid);
                                  if (e.key === "Escape") setRenamingUuid(null);
                                }}
                                className="h-5 py-0 px-1 text-xs flex-1"
                              />
                            ) : (
                              <button
                                onClick={() => toggleGroup(group.id)}
                                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                              >
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ background: group.color ?? "#6366F1" }}
                                />
                                <span className="flex-1 text-xs font-medium text-muted-foreground truncate">
                                  {group.name}
                                </span>
                                {isOpen
                                  ? <ChevronDown  className="w-3 h-3 shrink-0 text-muted-foreground" />
                                  : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                                }
                              </button>
                            )}

                            {/* Group context menu */}
                            {!isRenaming && (
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground opacity-0 group-hover/grp:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-3 h-3" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36 text-xs">
                                  <DropdownMenuItem
                                    onClick={() => startRename(group)}
                                    className="gap-2 text-xs cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteGroup(group)}
                                    variant="destructive"
                                    className="gap-2 text-xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {/* Lists inside this group */}
                          <Droppable droppableId={`grp:${group.uuid}`} type="LIST">
                            {(listDrop, listSnapshot) => (
                              <div
                                ref={listDrop.innerRef}
                                {...listDrop.droppableProps}
                                style={{ minHeight: showContents || listSnapshot.isDraggingOver ? undefined : "2px" }}
                                className={`transition-all ${
                                  showContents || listSnapshot.isDraggingOver
                                    ? "ml-3 pl-3 border-l mt-0.5 mb-1 space-y-0.5"
                                    : "ml-3 pl-3"
                                } ${
                                  listSnapshot.isDraggingOver
                                    ? "border-primary/50 bg-primary/5 rounded-r-md"
                                    : "border-border"
                                }`}
                              >
                                {listSnapshot.isDraggingOver && !isOpen && groupLists.length === 0 && (
                                  <p className="text-[10px] text-primary/50 px-1 py-1">Drop here</p>
                                )}
                                {showContents && groupLists.map((list, listIndex) => (
                                  <Draggable
                                    key={list.uuid}
                                    draggableId={`list:${list.uuid}`}
                                    index={listIndex}
                                  >
                                    {(listDrag) => renderListItem(list, listDrag, true)}
                                  </Draggable>
                                ))}
                                {listDrop.placeholder}
                              </div>
                            )}
                          </Droppable>

                        </div>
                      )}
                    </Draggable>
                  );
                })}

                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Ungrouped lists */}
          <Droppable droppableId="ungrouped" type="LIST">
            {(drop, snapshot) => (
              <div
                ref={drop.innerRef}
                {...drop.droppableProps}
                className={`space-y-0.5 min-h-[4px] rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? "bg-primary/5" : ""
                }`}
              >
                {ungroupedLists.map((list, i) => (
                  <Draggable key={list.uuid} draggableId={`list:${list.uuid}`} index={i}>
                    {(drag) => renderListItem(list, drag, false)}
                  </Draggable>
                ))}
                {drop.placeholder}
              </div>
            )}
          </Droppable>

        </DragDropContext>

        {/* + New List */}
        <button
          onClick={() => setNewListOpen(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mt-0.5"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          New List
        </button>
      </div>

      <NewListDialog
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        onCreated={list => {
          fetchData();
          onRefresh();
          router.push(`/todo?listUuid=${list.uuid}`);
        }}
      />
      <NewGroupDialog
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={() => fetchData()}
      />
    </div>
  );
}
