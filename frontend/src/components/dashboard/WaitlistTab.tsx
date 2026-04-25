import { Clock3Icon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useLeaveWaitlist, useMyWaitlist } from "@/hooks/useWaitlist";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export function WaitlistTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyWaitlist();
  const leaveWaitlist = useLeaveWaitlist();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!data?.waitlist_entries.length) {
    return (
      <EmptyState
        icon={Clock3Icon}
        title="No waitlist entries"
        description="Join a waitlist from any full plan and we’ll keep your position updated here."
        action={{
          label: "Browse plans",
          variant: "outline",
          onClick: () => navigate("/plans"),
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.waitlist_entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {entry.plan.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {entry.plan.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Position #{entry.queue_position} · Joined{" "}
                {formatDate(entry.joined_at)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-destructive hover:text-destructive"
            onClick={() => leaveWaitlist.mutate(entry.plan.id)}
          >
            Leave
          </Button>
        </div>
      ))}
    </div>
  );
}
