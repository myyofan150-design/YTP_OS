"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import type {
  ApiResponse,
  SmartViewType,
  TodoGroup,
  TodoList,
  TodoListMember,
  TodoTask,
  TodoTaskDetail,
} from "@/types";

// ─── useTodoGroups ─────────────────────────────────────────────────────────────

export function useTodoGroups() {
  const [groups, setGroups]   = useState<TodoGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<TodoGroup[]>>("/todo/groups");
      setGroups(r.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  async function createGroup(data: { name: string; color?: string }): Promise<boolean> {
    try {
      await api.post("/todo/groups", data);
      await refetch();
      toast.success("Group created");
      return true;
    } catch {
      toast.error("Failed to create group");
      return false;
    }
  }

  async function updateGroup(uuid: string, data: { name?: string; color?: string }): Promise<boolean> {
    try {
      await api.patch(`/todo/groups/${uuid}`, data);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update group");
      return false;
    }
  }

  async function deleteGroup(uuid: string): Promise<boolean> {
    try {
      await api.delete(`/todo/groups/${uuid}`);
      await refetch();
      toast.success("Group deleted");
      return true;
    } catch {
      toast.error("Failed to delete group");
      return false;
    }
  }

  return { groups, loading, refetch, createGroup, updateGroup, deleteGroup };
}

// ─── useTodoLists ──────────────────────────────────────────────────────────────

export function useTodoLists(groupId?: string) {
  const [lists, setLists]     = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (groupId) params["groupId"] = groupId;
      const r = await api.get<ApiResponse<TodoList[]>>("/todo/lists", { params });
      setLists(r.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function createList(data: {
    name: string;
    groupId?: string | null;
    color?: string;
    icon?: string;
  }): Promise<boolean> {
    try {
      await api.post("/todo/lists", data);
      await refetch();
      toast.success("List created");
      return true;
    } catch {
      toast.error("Failed to create list");
      return false;
    }
  }

  async function updateList(
    uuid: string,
    data: Partial<{ name: string; color: string; icon: string; groupId: string | null }>,
  ): Promise<boolean> {
    try {
      await api.patch(`/todo/lists/${uuid}`, data);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update list");
      return false;
    }
  }

  async function deleteList(uuid: string): Promise<boolean> {
    try {
      await api.delete(`/todo/lists/${uuid}`);
      await refetch();
      toast.success("List deleted");
      return true;
    } catch {
      toast.error("Failed to delete list");
      return false;
    }
  }

  async function toggleFavorite(uuid: string): Promise<boolean> {
    try {
      await api.patch(`/todo/lists/${uuid}/favorite`);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update favourite");
      return false;
    }
  }

  return { lists, loading, refetch, createList, updateList, deleteList, toggleFavorite };
}

// ─── useTodoList (single list + its tasks) ────────────────────────────────────

export function useTodoList(uuid: string | null) {
  const [list, setList]       = useState<(TodoList & { tasks: TodoTask[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<TodoList & { tasks: TodoTask[] }>>(`/todo/lists/${uuid}`);
      setList(r.data.data);
    } catch {
      toast.error("Failed to load list");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  async function createTask(data: {
    title: string;
    stage?: string;
    priority?: string;
    dueDate?: string | null;
    assignedTo?: number | null;
  }): Promise<boolean> {
    if (!uuid) return false;
    try {
      await api.post(`/todo/lists/${uuid}/tasks`, data);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to create task");
      return false;
    }
  }

  return { list, loading, refetch, createTask };
}

// ─── useTodoTask (full task detail) ───────────────────────────────────────────

export function useTodoTask(uuid: string | null) {
  const [task, setTask]       = useState<TodoTaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<TodoTaskDetail>>(`/todo/tasks/${uuid}`);
      setTask(r.data.data);
    } catch {
      toast.error("Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  async function updateTask(data: Record<string, unknown>): Promise<boolean> {
    if (!uuid) return false;
    try {
      await api.patch(`/todo/tasks/${uuid}`, data);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update task");
      return false;
    }
  }

  async function toggleStatus(): Promise<boolean> {
    if (!uuid) return false;
    try {
      await api.patch(`/todo/tasks/${uuid}/status`);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update status");
      return false;
    }
  }

  async function deleteTask(): Promise<boolean> {
    if (!uuid) return false;
    try {
      await api.delete(`/todo/tasks/${uuid}`);
      toast.success("Task deleted");
      return true;
    } catch {
      toast.error("Failed to delete task");
      return false;
    }
  }

  return { task, loading, refetch, updateTask, toggleStatus, deleteTask };
}

// ─── useTodoListMembers ────────────────────────────────────────────────────────

export function useTodoListMembers(listUuid: string | null) {
  const [members,  setMembers]  = useState<TodoListMember[]>([]);
  const [loading,  setLoading]  = useState(false);

  const refetch = useCallback(async () => {
    if (!listUuid) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<TodoListMember[]>>(`/todo/lists/${listUuid}/members`);
      setMembers(r.data.data ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [listUuid]);

  useEffect(() => { refetch(); }, [refetch]);

  async function addMembers(userIds: number[]): Promise<boolean> {
    if (!listUuid) return false;
    try {
      await api.post(`/todo/lists/${listUuid}/members`, { userIds });
      await refetch();
      return true;
    } catch {
      toast.error("Failed to add members");
      return false;
    }
  }

  async function removeMember(userId: number): Promise<boolean> {
    if (!listUuid) return false;
    try {
      await api.delete(`/todo/lists/${listUuid}/members/${userId}`);
      await refetch();
      return true;
    } catch {
      toast.error("Failed to remove member");
      return false;
    }
  }

  async function syncMembers(userIds: number[]): Promise<boolean> {
    if (!listUuid) return false;
    try {
      await api.patch(`/todo/lists/${listUuid}`, { memberUserIds: userIds });
      await refetch();
      return true;
    } catch {
      toast.error("Failed to update members");
      return false;
    }
  }

  return { members, loading, refetch, addMembers, removeMember, syncMembers };
}

// ─── useSmartView ──────────────────────────────────────────────────────────────

export function useSmartView(view: SmartViewType | null, params?: Record<string, unknown>) {
  const [tasks, setTasks]     = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const paramsKey = JSON.stringify(params ?? {});

  const refetch = useCallback(async () => {
    if (!view) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse<TodoTask[]>>(`/todo/smart/${view}`, { params: params ?? {} });
      setTasks(r.data.data);
    } catch {
      toast.error("Failed to load view");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, paramsKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { tasks, loading, refetch };
}
