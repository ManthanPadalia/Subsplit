import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatRupees } from "@/lib/utils";
import { useCancelSlot } from "@/hooks/useSlots";
import type { Slot } from "@/types";

interface ActiveSlotCardProps {
  slot: Slot;
}

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

function getWarningMessage(slot: Slot) {
  if (!slot.expires_at) {
    return null;
  }

  const expiresAt = new Date(slot.expires_at);
  const now = new Date();
  const diffInDays = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / MILLISECONDS_IN_DAY),
  );

  if (slot.status === "GRACE") {
    const graceEndsAt = new Date(expiresAt);
    graceEndsAt.setDate(graceEndsAt.getDate() + 3);
    const daysLeft = Math.max(
      0,
      Math.ceil((graceEndsAt.getTime() - now.getTime()) / MILLISECONDS_IN_DAY),
    );

    return `Grace period — ${daysLeft} day${
      daysLeft !== 1 ? "s" : ""
    } to renew before losing your slot`;
  }

  if (diffInDays <= 3) {
    return `Renews in ${diffInDays} day${diffInDays !== 1 ? "s" : ""}`;
  }

  return null;
}

export function ActiveSlotCard({ slot }: ActiveSlotCardProps) {
  const [accessOpen, setAccessOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelSlot = useCancelSlot();
  const warningMessage = getWarningMessage(slot);

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
              {slot.plan.name[0]}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                {slot.plan.name}
              </p>
              <StatusBadge status={slot.plan.category} />
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <StatusBadge
              status={slot.status}
              label={slot.status === "GRACE" ? "Grace period" : slot.status}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Slot #{slot.slot_number}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-6 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Since</p>
            <p className="text-sm text-foreground">
              {slot.assigned_at ? formatDate(slot.assigned_at) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renews</p>
            <p
              className={
                slot.status === "GRACE"
                  ? "text-sm font-medium text-warning"
                  : "text-sm text-foreground"
              }
            >
              {slot.expires_at ? formatDate(slot.expires_at) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="text-sm font-medium text-foreground">
              {formatRupees(slot.plan.user_pays_paise)}
            </p>
          </div>
        </div>

        {warningMessage ? (
          <div className="mt-3 rounded-md border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
            {warningMessage}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAccessOpen((current) => !current)}
          >
            Access details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            Cancel slot
          </Button>
        </div>

        {accessOpen ? (
          <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {slot.plan.access_instructions ||
              "Access details will appear here."}
          </div>
        ) : null}
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Your slot will be released immediately. No refund for current
              month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my slot</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => cancelSlot.mutate(slot.id)}
            >
              Yes, cancel slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
