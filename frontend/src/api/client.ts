import axios from "axios";

import { useAuthStore } from "@/store/authStore";
import type { ApiErrorResponse } from "@/types";

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const requestDelayMs = Number(import.meta.env.VITE_API_DELAY_MS ?? 0);

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  if (Number.isFinite(requestDelayMs) && requestDelayMs > 0) {
    await sleep(requestDelayMs);
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error?.message || "Something went wrong";
  }

  return "Something went wrong";
}
