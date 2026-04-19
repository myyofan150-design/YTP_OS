"use client";

// src/app/(auth)/login/page.tsx
// Login page — authenticates via POST /api/auth/login and stores token in authStore.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white font-bold text-lg">
            AO
          </div>
          <h2 className="text-xl font-bold text-slate-800">Agency OS</h2>
          <p className="text-sm text-slate-500">Internal Management System</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-700">
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
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-[#0F172A] hover:bg-slate-700 text-white text-sm"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          YouTooPreneur Agency OS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
