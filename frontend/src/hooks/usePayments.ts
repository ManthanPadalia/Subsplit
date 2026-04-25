import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/api/client";
import { createOrder, getMyPayments, verifyPayment } from "@/api/payments";

interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function useMyPayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => getMyPayments(),
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success("Order created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }: VerifyPaymentPayload) =>
      verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Slot activated!");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
