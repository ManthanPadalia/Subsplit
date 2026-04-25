import { apiClient } from "./client";

import type {
  ApiSuccessResponse,
  MySlotsResponse,
  SlotDetail,
  SlotStatus,
} from "@/types";

export async function getMySlots(
  status?: SlotStatus,
): Promise<MySlotsResponse> {
  const params = status ? { status } : undefined;
  const { data } = await apiClient.get<ApiSuccessResponse<MySlotsResponse>>(
    "/slots/my",
    { params },
  );

  return data.data;
}

export async function getSlot(id: string): Promise<SlotDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<SlotDetail>>(
    `/slots/${id}`,
  );

  return data.data;
}

export async function cancelSlot(id: string): Promise<void> {
  await apiClient.delete<ApiSuccessResponse<null>>(`/slots/${id}/cancel`);
}
