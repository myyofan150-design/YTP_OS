"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { data } = res.data as { success: boolean; data: { token: string; user: object } };
      const userData = (data as { user: { id: number; uuid: string; name: string; email: string; role: string; status: string; avatarUrl?: string | null } }).user;
      const token    = (data as { token: string }).token;
      login(userData, token);

      // Fire confetti on successful login
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
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, #071A0F 0%, #0A2015 50%, #071A0F 100%)" }}
    >
      {/* ── Animated gradient orbs ── */}
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

      {/* ── Dot grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,115,89,.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative animate-float">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white font-bold text-xl relative z-10"
              style={{ background: "linear-gradient(135deg, #007359, #03ff94)" }}
            >
              AO
            </div>
            {/* Glow behind logo */}
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-70"
              style={{ background: "linear-gradient(135deg, #007359, #03ff94)" }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Agency OS</h1>
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
          {/* Card header gradient line */}
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
            style={{ background: "linear-gradient(90deg, transparent, rgba(3,255,148,.4), transparent)" }}
          />

          <h2 className="text-lg font-semibold text-white mb-0.5">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@agencyos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-10 text-sm transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,.06)",
                  borderColor: "rgba(0,115,89,.25)",
                  color: "white",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 text-sm transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,.06)",
                  borderColor: "rgba(0,115,89,.25)",
                  color: "white",
                }}
              />
            </div>

            {error && (
              <div
                className="animate-scale-in flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-red-400"
                style={{
                  background: "rgba(239,68,68,.10)",
                  border: "1px solid rgba(239,68,68,.25)",
                }}
              >
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-10 rounded-xl text-white text-sm font-semibold overflow-hidden transition-all duration-300 disabled:opacity-70"
              style={{
                background: loading
                  ? "rgba(0,115,89,.55)"
                  : "linear-gradient(135deg, #007359 0%, #009468 100%)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(0,115,89,.4)",
              }}
            >
              {/* Shimmer sweep on hover */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)" }}
              />
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in →"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          YouTooPreneur Agency OS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
