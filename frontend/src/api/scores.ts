import { apiClient } from "./client";

import type { ApiSuccessResponse, ScoreSummary } from "@/types";

export async function getMyScore(): Promise<ScoreSummary> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<ScoreSummary>>("/scores/my");

  return data.data;
}
