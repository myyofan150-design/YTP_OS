"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/modules/users/RoleBadge";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
      <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Profile Information</p>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground text-base">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <RoleBadge role={user.role} />
              <Badge
                variant="outline"
                className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              >
                {user.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium">User ID</p>
            <p className="text-sm text-foreground mt-0.5">{user.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Role</p>
            <p className="text-sm text-foreground mt-0.5">{user.role.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="animate-fade-up delay-100 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Change Password</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pwd" className="text-xs font-medium text-foreground">
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
            <Label htmlFor="new-pwd" className="text-xs font-medium text-foreground">
              New password <span className="text-muted-foreground">(min 8 characters)</span>
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
            <Label htmlFor="confirm-pwd" className="text-xs font-medium text-foreground">
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
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500 border border-red-500/20 max-w-sm">
              {pwdError}
            </p>
          )}
          {pwdSuccess && (
            <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 border border-emerald-500/20 max-w-sm">
              {pwdSuccess}
            </p>
          )}

          <Button
            type="submit"
            disabled={pwdLoading}
            className="h-9 text-sm bg-primary hover:bg-primary/85 text-primary-foreground"
          >
            {pwdLoading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
