import { apiClient } from "./client";

import type {
  ApiSuccessResponse,
  CreateOrderResponse,
  MyPaymentsResponse,
  PaymentStatus,
  VerifyPaymentResponse,
} from "@/types";

export async function createOrder(
  planId: string,
): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<CreateOrderResponse>
  >("/payments/create-order", { plan_id: planId });

  return data.data;
}

export async function verifyPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
): Promise<VerifyPaymentResponse> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<VerifyPaymentResponse>
  >("/payments/verify", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  return data.data;
}

export async function getMyPayments(
  status?: PaymentStatus,
): Promise<MyPaymentsResponse> {
  const params = status ? { status } : undefined;
  const { data } = await apiClient.get<ApiSuccessResponse<MyPaymentsResponse>>(
    "/payments/my",
    { params },
  );

  return data.data;
}
