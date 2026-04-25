import { CheckCircle2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DemandSignal } from "@/types";

interface DemandSignalsProps {
  demandSignals: DemandSignal[];
  loading?: boolean;
}

export function DemandSignals({
  demandSignals,
  loading = false,
}: DemandSignalsProps) {
  const [queuedSignals, setQueuedSignals] = useState<Record<string, boolean>>(
    {},
  );
  const maxRequests = Math.max(
    ...demandSignals.map((signal) => signal.request_count),
    1,
  );

  const handleQueueSignal = (signalId: string) => {
    setQueuedSignals((current) => ({
      ...current,
      [signalId]: true,
    }));
  };

  return (
    <Card>
      <CardHeader className="p-5">
        <div className="flex flex-col gap-1">
          <CardTitle>Demand signals — what users want next</CardTitle>
          <p className="text-sm text-muted-foreground">
            Based on waitlist data and user preferences. Click &quot;Add
            plan&quot; to queue a new plan.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <Card key={index}>
                  <CardContent className="flex flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            : demandSignals.map((signal) => {
                const added = Boolean(queuedSignals[signal.id]);

                return (
                  <Card key={signal.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {signal.name}
                            </p>
                            <div>
                              <StatusBadge status={signal.category} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-primary">
                            {signal.request_count} requests
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{
                              width: `${(signal.request_count / maxRequests) * 100}%`,
                            }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Est. margin: ₹
                          {signal.estimated_margin_rupees.toFixed(0)}/slot/mo
                        </p>

                        <Button
                          size="sm"
                          variant={added ? "ghost" : "outline"}
                          disabled={added}
                          onClick={() => handleQueueSignal(signal.id)}
                        >
                          {added ? (
                            <>
                              <CheckCircle2Icon data-icon="inline-start" />
                              Queued
                            </>
                          ) : (
                            <>
                              <PlusIcon data-icon="inline-start" />
                              Add plan
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}
