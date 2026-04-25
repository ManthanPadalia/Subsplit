import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CheckoutCard } from "@/components/plans/CheckoutCard";
import { PaymentModal } from "@/components/plans/PaymentModal";
import { SlotGrid } from "@/components/plans/SlotGrid";
import { WaitlistModal } from "@/components/plans/WaitlistModal";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePlan } from "@/hooks/usePlans";
import { useMySlots } from "@/hooks/useSlots";

export function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const { data: plan, isLoading, isError, refetch } = usePlan(id ?? "");
  const { data: mySlots } = useMySlots(undefined, isAuthenticated);
  useDocumentTitle(
    plan ? `${plan.name} — SubSplit` : "Plan Details — SubSplit",
  );

  const heldSlot = useMemo(
    () => mySlots?.slots.find((slot) => slot.plan.id === plan?.id) ?? null,
    [mySlots?.slots, plan?.id],
  );

  const handleAuthRedirect = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/plans/${id}`)}`);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-3 flex flex-col gap-6 lg:col-span-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="col-span-3 lg:col-span-1">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (isError || !plan) {
    return (
      <AppShell>
        <ErrorState onRetry={() => void refetch()} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-3 flex flex-col gap-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xl font-bold text-primary">
                {plan.name[0]}
              </div>
              <div>
                <div className="mb-2">
                  <StatusBadge status={plan.category} />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {plan.name}
                </h1>
                <div className="mt-1 flex items-center gap-1 text-xs text-success">
                  <div className="size-1.5 rounded-full bg-success" />
                  {plan.uptime_percentage}% uptime last 30 days
                </div>
              </div>
            </div>

            <SlotGrid plan={plan} />

            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                About this plan
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {plan.description}
              </p>
            </div>

            {heldSlot && plan.access_instructions ? (
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  How to access
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {plan.access_instructions}
                </p>
              </div>
            ) : null}
          </div>

          <div className="col-span-3 lg:col-span-1">
            <div className="sticky top-20">
              <CheckoutCard
                plan={plan}
                onGetSlot={() => {
                  if (!isAuthenticated) {
                    handleAuthRedirect();
                    return;
                  }
                  setPaymentModalOpen(true);
                }}
                onJoinWaitlist={() => {
                  if (!isAuthenticated) {
                    handleAuthRedirect();
                    return;
                  }
                  setWaitlistModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          plan={plan}
        />

        <WaitlistModal
          open={waitlistModalOpen}
          onOpenChange={setWaitlistModalOpen}
          plan={plan}
        />
      </>
    </AppShell>
  );
}
