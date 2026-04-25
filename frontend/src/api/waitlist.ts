import { apiClient } from "./client";

import type {
  ApiSuccessResponse,
  JoinWaitlistResponse,
  MyWaitlistResponse,
} from "@/types";

export async function joinWaitlist(
  planId: string,
): Promise<JoinWaitlistResponse> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<JoinWaitlistResponse>
  >("/waitlist/join", { plan_id: planId });

  return data.data;
}

export async function leaveWaitlist(planId: string): Promise<void> {
  await apiClient.delete<ApiSuccessResponse<null>>(`/waitlist/leave/${planId}`);
}

export async function getMyWaitlist(): Promise<MyWaitlistResponse> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<MyWaitlistResponse>>("/waitlist/my");

  return data.data;
}
