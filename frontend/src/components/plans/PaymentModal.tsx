import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOrder, useVerifyPayment } from "@/hooks/usePayments";
import { formatRupees } from "@/lib/utils";
import type { PlanDetail, VerifyPaymentResponse } from "@/types";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetail;
}

export function PaymentModal({ open, onOpenChange, plan }: PaymentModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verificationResult, setVerificationResult] =
    useState<VerifyPaymentResponse | null>(null);
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();

  const nextAvailableSlot = plan.slots.find(
    (slot) => slot.status === "AVAILABLE",
  )?.slot_number;

  const resetState = (nextOpen: boolean) => {
    if (!nextOpen) {
      setVerificationResult(null);
    }
    onOpenChange(nextOpen);
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay checkout is unavailable right now");
      return;
    }

    if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
      toast.error("Missing Razorpay key");
      return;
    }

    try {
      const order = await createOrder.mutateAsync(plan.id);

      const razorpay = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount_paise,
        currency: "INR",
        name: "SubSplit",
        description: `Slot on ${plan.name}`,
        order_id: order.razorpay_order_id,
        handler: async (response) => {
          try {
            const result = await verifyPayment.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setVerificationResult(result);
          } catch {
            // Error toast is handled in the mutation hook.
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: "#6C47FF" },
      });

      razorpay.on?.("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });

      razorpay.open();
    } catch {
      // Error toast is handled in the mutation hook.
    }
  };

  const isPending = createOrder.isPending || verifyPayment.isPending;

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-md">
        {verificationResult ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Slot activated</DialogTitle>
              <DialogDescription>
                Your payment completed successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2Icon className="size-7 text-success" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                Slot activated!
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Your slot on {plan.name} is now active. Check your dashboard for
                access details.
              </p>
              <Button
                onClick={() => {
                  resetState(false);
                  navigate("/dashboard");
                }}
              >
                Go to dashboard
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm your slot</DialogTitle>
              <DialogDescription>
                You&apos;re getting a slot on {plan.name}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">
                    {plan.name}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Slot</span>
                  <span className="font-medium text-foreground">
                    #{nextAvailableSlot ?? "TBD"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-medium text-muted-foreground">
                    Total today
                  </span>
                  <span className="font-bold text-foreground">
                    {formatRupees(plan.user_pays_paise)}/mo
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => resetState(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={isPending}>
                {isPending ? (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Pay {formatRupees(plan.user_pays_paise)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
