"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { resolveAssetUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/modules/users/RoleBadge";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const toAbsUrl = resolveAssetUrl;

// ─── Avatar Upload Zone ───────────────────────────────────────────────────────

interface AvatarUploadProps {
  name:      string;
  avatarUrl: string | null | undefined;
  onSuccess: (newAvatarUrl: string) => void;
}

function AvatarUpload({ name, avatarUrl, onSuccess }: AvatarUploadProps) {
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [localSrc,   setLocalSrc]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentSrc = localSrc ?? toAbsUrl(avatarUrl);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    // Immediate local preview
    const reader = new FileReader();
    reader.onload = (e) => setLocalSrc(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const r = await api.patch("/auth/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedUser = r.data.data;
      onSuccess(updatedUser.avatarUrl);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
      setLocalSrc(null);
    } finally {
      setUploading(false);
    }
  }, [onSuccess]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Drop zone + avatar circle */}
      <div
        className="relative cursor-pointer"
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
      >
        {/* Outer drag-indicator ring */}
        <div
          className="rounded-full transition-all duration-200"
          style={{
            padding:    dragging ? 4 : 2,
            border:     dragging ? "2px dashed #00BFA5" : "2px dashed transparent",
            background: dragging ? "rgba(0,191,165,0.06)" : "transparent",
          }}
        >
          {/* Avatar circle */}
          <div className="relative h-24 w-24 rounded-full overflow-hidden group"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            {currentSrc ? (
              <img
                src={currentSrc}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center text-2xl font-bold"
                style={{ background: "rgba(0,191,165,0.12)", color: "#00BFA5" }}
              >
                {getInitials(name)}
              </div>
            )}

            {/* Hover / uploading overlay */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full transition-opacity duration-200 ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              style={{ background: "rgba(0,0,0,0.52)" }}
            >
              {uploading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <Camera size={20} color="white" />
                  <span className="text-[10px] text-white font-semibold leading-none">Change</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dragging overlay label */}
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none">
            <Upload size={22} color="#00BFA5" />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hint text */}
      <div className="text-center">
        <p className="text-[11.5px] font-medium" style={{ color: "var(--text-secondary)" }}>
          Click or drag &amp; drop to upload
        </p>
        <p className="text-[10.5px] mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.65 }}>
          JPG, PNG, WebP · max 5 MB
        </p>
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [pwdForm, setPwdForm] = useState({
    currentPassword:  "",
    newPassword:      "",
    confirmPassword:  "",
  });
  const [pwdError,   setPwdError]   = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [showDisableForm,  setShowDisableForm]  = useState(false);
  const [disablePassword,  setDisablePassword]  = useState("");
  const [disableError,     setDisableError]     = useState("");
  const [disableLoading,   setDisableLoading]   = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then(r => setTwoFactorEnabled(Boolean(r.data.data?.twoFactorEnabled)))
      .catch(() => {})
      .finally(() => setTwoFactorLoading(false));
  }, []);

  async function handleEnable2fa() {
    setTwoFactorLoading(true);
    try {
      await api.patch("/auth/2fa/toggle", { enable: true });
      setTwoFactorEnabled(true);
      toast.success("Two-step verification enabled");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to enable 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleDisable2fa(e: { preventDefault(): void }) {
    e.preventDefault();
    setDisableError("");
    if (!disablePassword) { setDisableError("Password is required"); return; }
    setDisableLoading(true);
    try {
      await api.patch("/auth/2fa/toggle", { enable: false, password: disablePassword });
      setTwoFactorEnabled(false);
      setShowDisableForm(false);
      setDisablePassword("");
      toast.success("Two-step verification disabled");
    } catch (err: unknown) {
      setDisableError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to disable 2FA");
    } finally {
      setDisableLoading(false);
    }
  }

  function setPwd(field: string, value: string) {
    setPwdForm(prev => ({ ...prev, [field]: value }));
    setPwdError("");
    setPwdSuccess("");
  }

  function handleAvatarSuccess(newAvatarUrl: string) {
    if (user) setUser({ ...user, avatarUrl: newAvatarUrl });
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
        newPassword:     pwdForm.newPassword,
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

      {/* ── Profile Info Card ── */}
      <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-5">
          Profile Information
        </p>

        <div className="flex items-start gap-6">
          {/* Avatar upload zone */}
          <AvatarUpload
            name={user.name}
            avatarUrl={user.avatarUrl}
            onSuccess={handleAvatarSuccess}
          />

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-semibold text-foreground text-lg leading-tight">{user.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
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

        <div className="grid grid-cols-2 gap-4 pt-4 mt-5 border-t border-border">
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

      {/* ── Change Password Card ── */}
      <div className="animate-fade-up delay-100 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Change Password
        </p>

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
              New password <span className="text-muted-foreground font-normal">(min 8 characters)</span>
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

      {/* ── Two-Step Verification Card ── */}
      <div className="animate-fade-up delay-200 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Two-Step Verification
        </p>

        {twoFactorLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {twoFactorEnabled ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                    <ShieldCheck size={18} className="text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                    <ShieldOff size={18} className="text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {twoFactorEnabled
                      ? "A verification code will be sent to your email at each login."
                      : "Add an extra layer of security to your account."}
                  </p>
                </div>
              </div>

              {twoFactorEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => { setShowDisableForm(v => !v); setDisableError(""); setDisablePassword(""); }}
                >
                  Disable
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0 bg-primary hover:bg-primary/85 text-primary-foreground"
                  onClick={handleEnable2fa}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? "Enabling…" : "Enable"}
                </Button>
              )}
            </div>

            {/* Inline disable form */}
            {showDisableForm && (
              <form
                onSubmit={handleDisable2fa}
                className="rounded-xl border border-border p-4 space-y-3"
                style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}
              >
                <p className="text-xs text-muted-foreground">
                  Confirm your password to disable two-step verification.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="disable-pwd" className="text-xs font-medium text-foreground">
                    Current password
                  </Label>
                  <Input
                    id="disable-pwd"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => { setDisablePassword(e.target.value); setDisableError(""); }}
                    placeholder="••••••••"
                    required
                    className="h-9 text-sm max-w-sm"
                  />
                </div>
                {disableError && (
                  <p className="text-xs text-red-500">{disableError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                    disabled={disableLoading}
                  >
                    {disableLoading ? "Disabling…" : "Confirm Disable"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => { setShowDisableForm(false); setDisableError(""); setDisablePassword(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
