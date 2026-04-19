// src/hooks/useAuth.ts
// Convenience hook that exposes auth state and actions from the Zustand store.

import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, setUser } = useAuthStore();
  return { user, token, isAuthenticated, login, logout, setUser };
}
