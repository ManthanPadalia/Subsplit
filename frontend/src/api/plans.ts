import { apiClient } from "./client";

import type {
  ApiSuccessResponse,
  PlanCategory,
  PlanDetail,
  PlansResponse,
} from "@/types";

export async function getPlans(
  category?: PlanCategory | "ALL",
): Promise<PlansResponse> {
  const params = category && category !== "ALL" ? { category } : undefined;
  const { data } = await apiClient.get<ApiSuccessResponse<PlansResponse>>(
    "/plans",
    { params },
  );

  return data.data;
}

export async function getPlan(id: string): Promise<PlanDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<PlanDetail>>(
    `/plans/${id}`,
  );

  return data.data;
}
