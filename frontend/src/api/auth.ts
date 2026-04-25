import { apiClient } from "./client";

import type { ApiSuccessResponse, AuthResponse, UserWithScore } from "@/types";

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
    "/auth/login",
    {
      email,
      password,
    },
  );

  return data.data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
    "/auth/register",
    {
      name,
      email,
      password,
    },
  );

  return data.data;
}

export async function getMe(): Promise<UserWithScore> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<UserWithScore>>("/auth/me");

  return data.data;
}

export async function updateMe(name: string): Promise<UserWithScore> {
  const { data } = await apiClient.put<ApiSuccessResponse<UserWithScore>>(
    "/auth/me",
    { name },
  );

  return data.data;
}
