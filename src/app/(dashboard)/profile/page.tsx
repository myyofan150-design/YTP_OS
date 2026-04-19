"use client";

// src/app/(dashboard)/profile/page.tsx
// Shows current user info and a change-password form.

import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/modules/users/RoleBadge";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdError, setPwdError]     = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  function setPwd(field: string, value: string) {
    setPwdForm((prev) => ({ ...prev, [field]: value }));
    setPwdError("");
    setPwdSuccess("");
  }

  async function handleChangePassword(e: { preventDefault(): void }) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (pwdForm.newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
    try {
      await api.patch("/auth/change-password", {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwdSuccess("Password changed successfully.");
    } catch (err: unknown) {
      setPwdError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to change password."
      );
    } finally {
      setPwdLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Profile Info Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg font-semibold bg-indigo-100 text-indigo-700">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-800 text-base">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <RoleBadge role={user.role} />
                <Badge
                  variant="outline"
                  className="text-[11px] bg-green-50 text-green-700 border-green-200"
                >
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">User ID</p>
              <p className="text-sm text-slate-700 mt-0.5">{user.id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Role</p>
              <p className="text-sm text-slate-700 mt-0.5">{user.role.replace(/_/g, " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-pwd" className="text-xs font-medium text-slate-700">
                Current password
              </Label>
              <Input
                id="current-pwd"
                type="password"
                value={pwdForm.currentPassword}
                onChange={(e) => setPwd("currentPassword", e.target.value)}
                placeholder="••••••••"
                required
                className="h-9 text-sm max-w-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pwd" className="text-xs font-medium text-slate-700">
                New password <span className="text-slate-400">(min 8 characters)</span>
              </Label>
              <Input
                id="new-pwd"
                type="password"
                value={pwdForm.newPassword}
                onChange={(e) => setPwd("newPassword", e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-9 text-sm max-w-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd" className="text-xs font-medium text-slate-700">
                Confirm new password
              </Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwd("confirmPassword", e.target.value)}
                placeholder="••••••••"
                required
                className="h-9 text-sm max-w-sm"
              />
            </div>

            {pwdError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200 max-w-sm">
                {pwdError}
              </p>
            )}
            {pwdSuccess && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 border border-green-200 max-w-sm">
                {pwdSuccess}
              </p>
            )}

            <Button
              type="submit"
              disabled={pwdLoading}
              className="h-9 text-sm bg-[#0F172A] hover:bg-slate-700 text-white"
            >
              {pwdLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
