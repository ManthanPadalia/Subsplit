import { ShieldIcon, XIcon, ZapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";
import type { PlanDetail } from "@/types";

interface CheckoutCardProps {
  plan: PlanDetail;
  onGetSlot: () => void;
  onJoinWaitlist: () => void;
}

const trustBadges = [
  { icon: ShieldIcon, label: "Secure payment" },
  { icon: ZapIcon, label: "Instant access" },
  { icon: XIcon, label: "Cancel anytime" },
];

export function CheckoutCard({
  plan,
  onGetSlot,
  onJoinWaitlist,
}: CheckoutCardProps) {
  const savings = plan.subscription_cost_paise - plan.user_pays_paise;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pricing breakdown
          </p>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>
                {plan.name} ({plan.total_slots} slots)
              </span>
              <span>{formatRupees(plan.subscription_cost_paise)}/mo</span>
            </div>
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>÷ Your slot cost</span>
              <span>{formatRupees(plan.slot_cost_paise)}/mo</span>
            </div>
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>SubSplit platform fee</span>
              <span>+ {formatRupees(plan.platform_fee_paise)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <span>You pay</span>
              <span className="text-lg">
                {formatRupees(plan.user_pays_paise)}/mo
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success">
          You save {formatRupees(savings)}/mo compared to buying solo
        </div>

        {plan.available_slots > 0 ? (
          <Button className="w-full" size="lg" onClick={onGetSlot}>
            Get this slot — {formatRupees(plan.user_pays_paise)}/mo
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={onJoinWaitlist}
            >
              Join waitlist
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              This plan is full right now. Join the queue to claim the next open
              slot.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-border pt-2">
          {trustBadges.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 text-center"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
