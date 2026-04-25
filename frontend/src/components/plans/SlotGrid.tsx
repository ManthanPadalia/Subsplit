import { PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlanDetail } from "@/types";

interface SlotGridProps {
  plan: PlanDetail;
}

export function SlotGrid({ plan }: SlotGridProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        Slot availability
      </h2>

      <div className="grid grid-cols-4 gap-3">
        {plan.slots.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-medium",
              slot.status === "AVAILABLE"
                ? "border-dashed border-border bg-muted/30 text-muted-foreground"
                : "border-primary/30 bg-primary/5 text-primary",
            )}
          >
            {slot.status === "AVAILABLE" ? (
              <>
                <PlusIcon className="mb-1 size-4" />
                <span>Open</span>
              </>
            ) : (
              <>
                <div className="mb-1 flex size-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {slot.user_initials ?? "SS"}
                </div>
                <span>Slot {slot.slot_number}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {plan.available_slots} slot{plan.available_slots !== 1 ? "s" : ""}{" "}
        available out of {plan.total_slots} total
      </p>
    </div>
  );
}
