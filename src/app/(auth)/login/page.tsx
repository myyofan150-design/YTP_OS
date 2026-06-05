"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveAssetUrl } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Agency OS");

  // 2FA state
  const [step, setStep]           = useState<"credentials" | "otp">("credentials");
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    api.get("/settings/general").then(r => {
      const d = r.data.data;
      if (d?.company_logo_url) setLogoUrl(resolveAssetUrl(d.company_logo_url));
      if (d?.company_name)     setCompanyName(d.company_name);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { data } = res.data as { success: boolean; data: { requiresTwoFactor?: boolean; tempToken?: string; token?: string; user?: object } };

      if ((data as { requiresTwoFactor?: boolean }).requiresTwoFactor) {
        setTempToken((data as { tempToken: string }).tempToken);
        setStep("otp");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        return;
      }

      const userData = (data as { user: { id: number; uuid: string; name: string; email: string; role: string; status: string; avatarUrl?: string | null } }).user;
      const token    = (data as { token: string }).token;
      await finishLogin(userData, token);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setError("");
    setOtpLoading(true);

    try {
      const res = await api.post("/auth/2fa/verify", { tempToken, otp: code });
      const { data } = res.data as { success: boolean; data: { token: string; user: { id: number; uuid: string; name: string; email: string; role: string; status: string; avatarUrl?: string | null } } };
      await finishLogin(data.user, data.token);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Invalid or expired code.";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setOtpLoading(false);
    }
  }

  async function finishLogin(userData: { id: number; uuid: string; name: string; email: string; role: string; status: string; avatarUrl?: string | null }, token: string) {
    login(userData, token);
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 130,
      spread: 75,
      origin: { y: 0.65 },
      colors: ["#007359", "#03ff94", "#00a878", "#b3ffe0", "#004d3b", "#80ffca"],
      gravity: 0.9,
      decay: 0.92,
      scalar: 0.9,
    });
    router.push("/");
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...otp];
    text.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  }

  // ── Shared wrapper ─────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, #071A0F 0%, #0A2015 50%, #071A0F 100%)" }}
    >
      {/* Animated gradient orbs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/5 h-80 w-80 rounded-full blur-3xl opacity-25 animate-orb-1"
        style={{ background: "radial-gradient(circle, #007359, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/5 h-96 w-96 rounded-full blur-3xl opacity-15 animate-orb-2"
        style={{ background: "radial-gradient(circle, #03ff94, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full blur-3xl opacity-10"
        style={{ background: "radial-gradient(circle, #007359, transparent 70%)" }}
      />

      {/* Dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,115,89,.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative animate-float">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-14 w-14 rounded-2xl object-contain relative z-10"
                style={{ background: "rgba(255,255,255,0.08)", padding: 4 }}
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white font-bold text-xl relative z-10"
                style={{ background: "linear-gradient(135deg, #007359, #03ff94)" }}
              >
                {companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-70"
              style={{ background: "linear-gradient(135deg, #007359, #03ff94)" }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">{companyName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">Internal Management System</p>
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(13, 18, 41, 0.82)",
            backdropFilter: "blur(18px) saturate(150%)",
            WebkitBackdropFilter: "blur(18px) saturate(150%)",
            border: "1px solid rgba(0,115,89,.25)",
            boxShadow: "0 24px 64px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)",
          }}
        >
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
            style={{ background: "linear-gradient(90deg, transparent, rgba(3,255,148,.4), transparent)" }}
          />

          {step === "credentials" ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-0.5">Welcome back</h2>
              <p className="text-sm text-slate-400 mb-6">Sign in to your workspace</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-300">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="youtoopreneur@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-10 text-sm transition-all duration-200"
                    style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(0,115,89,.25)", color: "white" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 text-sm transition-all duration-200"
                    style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(0,115,89,.25)", color: "white" }}
                  />
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full h-10 rounded-xl text-white text-sm font-semibold overflow-hidden transition-all duration-300 disabled:opacity-70"
                  style={{
                    background: loading ? "rgba(0,115,89,.55)" : "linear-gradient(135deg, #007359 0%, #009468 100%)",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(0,115,89,.4)",
                  }}
                >
                  {loading ? <Spinner label="Signing in…" /> : "Sign in →"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep("credentials"); setError(""); setOtp(["","","","","",""]); }}
                className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-white mb-0.5">Check your email</h2>
              <p className="text-sm text-slate-400 mb-6">
                We sent a 6-digit code to <span className="text-slate-200 font-medium">{email}</span>
              </p>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold rounded-xl outline-none transition-all duration-150"
                      style={{
                        background: "rgba(255,255,255,.06)",
                        border: digit ? "1.5px solid rgba(3,255,148,.5)" : "1.5px solid rgba(0,115,89,.25)",
                        color: "white",
                        height: "52px",
                      }}
                    />
                  ))}
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={otpLoading || otp.join("").length < 6}
                  className="relative w-full h-10 rounded-xl text-white text-sm font-semibold overflow-hidden transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: otpLoading ? "rgba(0,115,89,.55)" : "linear-gradient(135deg, #007359 0%, #009468 100%)",
                    boxShadow: otpLoading ? "none" : "0 4px 20px rgba(0,115,89,.4)",
                  }}
                >
                  {otpLoading ? <Spinner label="Verifying…" /> : "Verify & Sign in →"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Didn&apos;t get the code?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setError(""); setOtp(["","","","","",""]); }}
                    className="text-slate-300 hover:text-white underline transition-colors"
                  >
                    Try again
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          YouTooPreneur&#8482; Agency OS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="animate-scale-in flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-red-400"
      style={{ background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.25)" }}
    >
      <span className="shrink-0">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      {label}
    </span>
  );
}
