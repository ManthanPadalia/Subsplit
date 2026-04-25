import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMyScore } from "@/hooks/useScore";

function getScoreDescription(score: number) {
  if (score >= 75) {
    return "Excellent! You get priority on all waitlists.";
  }

  if (score >= 40) {
    return "Good standing. Keep payments on time to improve.";
  }

  return "At risk. Late payments reduce your waitlist priority.";
}

export function ScoreRing() {
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const { data, isLoading } = useMyScore();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  const score = data?.subsplit_score ?? 0;

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
        <div className="relative size-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 201} 201`}
              className={cn(
                score >= 75
                  ? "text-success"
                  : score >= 40
                    ? "text-warning"
                    : "text-destructive",
              )}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-foreground">{score}</span>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            SubSplit Score
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {getScoreDescription(score)}
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-primary underline underline-offset-2"
            onClick={() => setScoreInfoOpen(true)}
          >
            How is this calculated?
          </button>
        </div>
      </div>

      <Dialog open={scoreInfoOpen} onOpenChange={setScoreInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How your SubSplit Score works</DialogTitle>
            <DialogDescription>
              Reliable payments improve your priority across the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>ON_TIME_PAYMENT +5 points — payment before expiry</p>
            <p>LATE_PAYMENT -5 points — payment during grace period</p>
            <p>SLOT_REVOKED -20 points — slot lost to non-payment</p>
            <p>
              ACCOUNT_LONGEVITY +10 points — 90 days with no revocations
              (one-time)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
