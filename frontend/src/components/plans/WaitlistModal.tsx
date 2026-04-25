import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useJoinWaitlist } from "@/hooks/useWaitlist";
import { formatRupees } from "@/lib/utils";
import type { JoinWaitlistResponse, PlanDetail } from "@/types";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetail;
}

export function WaitlistModal({
  open,
  onOpenChange,
  plan,
}: WaitlistModalProps) {
  const [result, setResult] = useState<JoinWaitlistResponse | null>(null);
  const joinWaitlist = useJoinWaitlist();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  const handleJoin = async () => {
    try {
      const response = await joinWaitlist.mutateAsync(plan.id);
      setResult(response);
    } catch {
      // Error toast is handled in the mutation hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Waitlist joined</DialogTitle>
              <DialogDescription>
                Your queue position has been confirmed.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2Icon className="size-7 text-success" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                You&apos;re on the waitlist
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                You&apos;re #{result.queue_position} in the queue for{" "}
                {plan.name}.
              </p>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join the waitlist</DialogTitle>
              <DialogDescription>
                This plan is full. Join the queue and we&apos;ll hold your place
                for the next available slot.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              You&apos;ll join the queue for{" "}
              <span className="font-medium text-foreground">{plan.name}</span>{" "}
              at{" "}
              <span className="font-medium text-foreground">
                {formatRupees(plan.user_pays_paise)}/mo
              </span>
              .
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoin} disabled={joinWaitlist.isPending}>
                {joinWaitlist.isPending ? (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Join waitlist
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
