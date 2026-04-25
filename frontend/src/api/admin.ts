import { apiClient } from "./client";

import type {
  AdminDashboard,
  AdminPlan,
  AdminPlanDetail,
  AdminPlansFilters,
  AdminPlansResponse,
  AdminUserDetail,
  AdminUsersFilters,
  AdminUsersResponse,
  AnalyticsData,
  ApiSuccessResponse,
  CreatePlanInput,
  LapseResult,
  PlanWaitlistResponse,
  RevokeSlotResponse,
  UpdatePlanInput,
} from "@/types";

function withDefinedParams<T extends object>(params?: T): T | undefined {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>).filter(
      ([, value]) => value !== undefined,
    ),
  ) as T;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<AdminDashboard>>("/admin/dashboard");

  return data.data;
}

export async function createPlan(data: CreatePlanInput): Promise<AdminPlan> {
  const response = await apiClient.post<ApiSuccessResponse<AdminPlan>>(
    "/admin/plans",
    data,
  );

  return response.data.data;
}

export async function updatePlan(
  id: string,
  data: UpdatePlanInput,
): Promise<AdminPlan> {
  const response = await apiClient.put<ApiSuccessResponse<AdminPlan>>(
    `/admin/plans/${id}`,
    data,
  );

  return response.data.data;
}

export async function getAdminPlans(
  filters?: AdminPlansFilters,
): Promise<AdminPlansResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<AdminPlansResponse>>(
    "/admin/plans",
    { params: withDefinedParams(filters) },
  );

  return data.data;
}

export async function getAdminPlan(id: string): Promise<AdminPlanDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<AdminPlanDetail>>(
    `/admin/plans/${id}`,
  );

  return data.data;
}

export async function revokeSlot(
  id: string,
  reason: string,
): Promise<RevokeSlotResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<RevokeSlotResponse>>(
    `/admin/slots/${id}/revoke`,
    { reason },
  );

  return data.data;
}

export async function getAdminUsers(
  filters?: AdminUsersFilters,
): Promise<AdminUsersResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<AdminUsersResponse>>(
    "/admin/users",
    { params: withDefinedParams(filters) },
  );

  return data.data;
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<AdminUserDetail>>(
    `/admin/users/${id}`,
  );

  return data.data;
}

export async function deactivateUser(id: string): Promise<void> {
  await apiClient.patch<ApiSuccessResponse<null>>(
    `/admin/users/${id}/deactivate`,
  );
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<AnalyticsData>>("/admin/analytics");

  return data.data;
}

export async function checkLapses(): Promise<LapseResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<LapseResult>>(
    "/admin/slots/check-lapses",
  );

  return data.data;
}

export async function getPlanWaitlist(
  planId: string,
): Promise<PlanWaitlistResponse> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<PlanWaitlistResponse>
  >(`/admin/waitlist/${planId}`);

  return data.data;
}
