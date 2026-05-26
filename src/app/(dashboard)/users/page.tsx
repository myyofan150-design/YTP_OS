"use client";

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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage system user accounts</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowAdd(true)}
            className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground gap-2"
          >
            <UserPlus size={14} />
            Add User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="animate-fade-in delay-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-10">#</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Login</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</TableHead>
              {canManage && (
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell colSpan={canManage ? 7 : 6}>
                    <Skeleton className="h-8 w-full rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow className="border-b border-border last:border-0">
                <TableCell colSpan={canManage ? 7 : 6} className="text-center py-12 text-sm text-muted-foreground">
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u, idx) => (
                <TableRow
                  key={u.id}
                  className={`border-b border-border last:border-0 text-sm hover:bg-muted/40 transition-colors ${u.status === "INACTIVE" ? "opacity-50" : ""}`}
                >
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground text-xs leading-tight">{u.name}</p>
                        <p className="text-muted-foreground text-[11px]">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell><RoleBadge role={u.role} /></TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-2 py-0.5 ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                      }`}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-xs">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : <span className="text-muted-foreground/40">Never</span>}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(u.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </TableCell>

                  {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={actionLoading === u.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-sm">
                          <DropdownMenuItem onClick={() => setEditUser(u)} className="gap-2 text-xs cursor-pointer">
                            <Pencil size={12} /> Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(u)} className="gap-2 text-xs cursor-pointer">
                            <KeyRound size={12} /> Reset password
                          </DropdownMenuItem>
                          {u.id !== me?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleStatus(u)}
                                className={`gap-2 text-xs cursor-pointer ${
                                  u.status === "ACTIVE" ? "text-red-500" : "text-emerald-600"
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
        <p className="text-xs text-muted-foreground">
          {users.length} user{users.length !== 1 ? "s" : ""}
          {search && " matching your search"}
        </p>
      )}

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={fetchUsers} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={fetchUsers} />
    </div>
  );
}
