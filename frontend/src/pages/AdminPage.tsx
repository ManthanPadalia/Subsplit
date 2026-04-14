import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { checkLapses, getAdminDashboard, updatePlan } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import { AddPlanDialog } from "@/components/admin/AddPlanDialog";
import { MetricCard } from "@/components/admin/MetricCard";
import { AdminShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupees } from "@/lib/utils";
import type { AdminDashboardMetrics, AdminPlan } from "@/types";

function getMetricCards(metrics: AdminDashboardMetrics) {
  return [
    {
      label: "Monthly revenue",
      value: formatRupees(metrics.total_monthly_revenue_paise),
      delta: "Current monthly run-rate",
    },
    {
      label: "Slot utilization",
      value: `${metrics.occupied_slots} / ${metrics.total_slots}`,
      delta: `${metrics.utilization_percentage.toFixed(1)}% occupied`,
    },
    {
      label: "Total users",
      value: `${metrics.total_users}`,
      delta: `+${metrics.new_users_this_month} this month`,
    },
    {
      label: "Platform fee earned",
      value: formatRupees(metrics.platform_fee_earned_paise),
      delta: "Pure margin",
    },
  ];
}

function LoadingTableRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 8 }, (__unused, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton className="h-4 w-full max-w-[7rem]" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: getAdminDashboard,
  });

  const togglePlanMutation = useMutation({
    mutationFn: ({ id, nextIsActive }: { id: string; nextIsActive: boolean }) =>
      updatePlan(id, { is_active: nextIsActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      setUpdatingPlanId(null);
    },
  });

  const lapseMutation = useMutation({
    mutationFn: checkLapses,
    onSuccess: async (result) => {
      toast.success(
        `${result.moved_to_grace.length} moved to grace, ${result.revoked.length} revoked.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleTogglePlan = (plan: AdminPlan) => {
    setUpdatingPlanId(plan.id);
    togglePlanMutation.mutate({
      id: plan.id,
      nextIsActive: !plan.is_active,
    });
  };

  return (
    <AdminShell>
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-col gap-8 duration-300">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Admin overview
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Admin dashboard
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Monitor plan performance, active utilization, and slots that
                need intervention.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => lapseMutation.mutate()}
              disabled={lapseMutation.isPending}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={lapseMutation.isPending ? "animate-spin" : undefined}
              />
              Check lapses
            </Button>
          </div>
        </div>

        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}

        {!isError ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <MetricCard key={index} label="" value="" delta="" loading />
                ))
              : getMetricCards(data!.metrics).map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    delta={metric.delta}
                  />
                ))}
          </div>
        ) : null}

        {!isError ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_20rem]">
            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Plans
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Review utilization, revenue, and activation status across
                    all active and inactive plans.
                  </p>
                </div>

                <Button onClick={() => setIsAddPlanOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add plan
                </Button>
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Slots</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Price/slot</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <LoadingTableRows />
                    ) : data?.plans_summary.length ? (
                      data.plans_summary.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium text-foreground">
                            {plan.name}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={plan.category} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {plan.occupied_slots}/{plan.total_slots}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(plan.utilization_percentage, 0),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {plan.utilization_percentage.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-foreground">
                            {formatRupees(plan.user_pays_paise)}
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums text-foreground">
                            {formatRupees(plan.monthly_revenue_paise)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={() => handleTogglePlan(plan)}
                              disabled={
                                togglePlanMutation.isPending &&
                                updatingPlanId === plan.id
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost">
                              <Link to={`/admin/plans/${plan.id}`}>Manage</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No plans found. Add your first subscription plan to
                          get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 md:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Slots needing attention
                </h2>
                <p className="text-sm text-muted-foreground">
                  Grace-period slots are shown here until the user recovers or
                  gets revoked.
                </p>
              </div>

              <div className="mt-5 flex flex-col">
                {isLoading ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b border-border py-3 last:border-0"
                    >
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </div>
                  ))
                ) : data?.at_risk_slots.length ? (
                  data.at_risk_slots.map((slot) => (
                    <div
                      key={slot.slot_id}
                      className="flex items-center justify-between border-b border-border py-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {slot.user_name || "Unassigned user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.plan_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge
                          status={slot.status}
                          label={
                            slot.status === "GRACE"
                              ? "Grace period"
                              : slot.status
                          }
                        />
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Score: {slot.subsplit_score ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-10 text-sm text-muted-foreground">
                    All slots are healthy.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <AddPlanDialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen} />
    </AdminShell>
  );
}
