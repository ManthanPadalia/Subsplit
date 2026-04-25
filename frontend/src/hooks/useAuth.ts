import { useMutation } from "@tanstack/react-query";

import { login, register } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginPayload) => login(email, password),
  });
  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }: RegisterPayload) =>
      register(name, email, password),
  });

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === "ADMIN",
    setAuth,
    clearAuth,
    loginMutation,
    registerMutation,
  };
}
