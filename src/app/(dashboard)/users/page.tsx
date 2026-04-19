"use client";

// src/app/(dashboard)/users/page.tsx
// User management table with Add User modal and row actions.

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AddUserModal } from "@/components/modules/users/AddUserModal";
import { EditUserModal } from "@/components/modules/users/EditUserModal";
import { RoleBadge } from "@/components/modules/users/RoleBadge";
import { UserPlus, MoreHorizontal, Search, ShieldOff, Shield, KeyRound, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: User[] }>("/users", {
        params: search ? { search } : {},
      });
      setUsers(res.data.data);
    } catch {
      // handled by axios interceptor
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  async function toggleStatus(user: User) {
    setActionLoading(user.id);
    try {
      await api.patch(`/users/${user.id}/status`);
      fetchUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function resetPassword(user: User) {
    const newPwd = prompt(`Reset password for ${user.name}:\nEnter new password (min 8 characters):`);
    if (!newPwd || newPwd.length < 8) return;
    setActionLoading(user.id);
    try {
      await api.patch(`/users/${user.id}/reset-password`, { newPassword: newPwd });
      alert("Password reset successfully.");
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to reset password"
      );
    } finally {
      setActionLoading(null);
    }
  }

  const canManage = me?.role === "SUPER_ADMIN" || me?.role === "ADMIN";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {canManage && (
          <Button
            onClick={() => setShowAdd(true)}
            className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white gap-2"
          >
            <UserPlus size={14} />
            Add User
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold text-slate-500 w-10">#</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">User</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Role</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Last Login</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Joined</TableHead>
              {canManage && (
                <TableHead className="text-xs font-semibold text-slate-500 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canManage ? 7 : 6}>
                    <Skeleton className="h-8 w-full rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="text-center py-12 text-sm text-slate-400">
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u, idx) => (
                <TableRow
                  key={u.id}
                  className={`text-sm ${u.status === "INACTIVE" ? "opacity-50" : ""}`}
                >
                  <TableCell className="text-slate-400 text-xs">{idx + 1}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-800 text-xs leading-tight">{u.name}</p>
                        <p className="text-slate-400 text-[11px]">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell><RoleBadge role={u.role} /></TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-2 py-0.5 ${
                        u.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-500 text-xs">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : <span className="text-slate-300">Never</span>}
                  </TableCell>

                  <TableCell className="text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </TableCell>

                  {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={actionLoading === u.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-sm">
                          <DropdownMenuItem
                            onClick={() => setEditUser(u)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Pencil size={12} /> Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resetPassword(u)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <KeyRound size={12} /> Reset password
                          </DropdownMenuItem>
                          {u.id !== me?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleStatus(u)}
                                className={`gap-2 text-xs cursor-pointer ${
                                  u.status === "ACTIVE" ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {u.status === "ACTIVE" ? (
                                  <><ShieldOff size={12} /> Deactivate</>
                                ) : (
                                  <><Shield size={12} /> Activate</>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && users.length > 0 && (
        <p className="text-xs text-slate-400">
          {users.length} user{users.length !== 1 ? "s" : ""}
          {search && " matching your search"}
        </p>
      )}

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={fetchUsers} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={fetchUsers} />
    </div>
  );
}
