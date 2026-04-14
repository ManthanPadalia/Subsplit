import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === "ADMIN",
    setAuth,
    clearAuth,
  };
}
