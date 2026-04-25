import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

import { SlotDot } from "@/components/plans/SlotDot";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/utils";
import type { Plan } from "@/types";

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/plans/${plan.id}`);
  };

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleNavigate();
  };

  return (
    <div
      className="bg-card border border-border rounded-lg relative overflow-hidden hover:ring-1 hover:ring-border transition-all duration-200 cursor-pointer"
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />

      <div className="p-5 pt-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <StatusBadge status={plan.category} />
          <span className="flex items-center gap-1 text-xs text-success">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            {plan.uptime_percentage}% uptime
          </span>
        </div>

        <h3 className="mb-1 text-base font-semibold text-foreground">
          {plan.name}
        </h3>

        <div className="mb-1 mt-3 flex gap-1.5">
          {Array.from({ length: plan.total_slots }).map((_, index) => (
            <SlotDot key={index} filled={index < plan.occupied_slots} />
          ))}
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          {plan.available_slots} of {plan.total_slots} slots available
        </p>

        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {formatRupees(plan.user_pays_paise)}
          </span>
          <span className="text-sm text-muted-foreground">/mo per slot</span>
        </div>

        <span className="inline-flex rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Save{" "}
          {formatRupees(plan.subscription_cost_paise - plan.user_pays_paise)}
          /mo vs solo
        </span>

        <div className="mt-4">
          <Button
            className="w-full"
            size="sm"
            variant={plan.available_slots > 0 ? "default" : "outline"}
            onClick={handleButtonClick}
          >
            {plan.available_slots > 0 ? "Get this slot" : "Join waitlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
