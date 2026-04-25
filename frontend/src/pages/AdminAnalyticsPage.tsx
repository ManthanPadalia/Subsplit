import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { getAdminDashboard, getAnalytics } from "@/api/admin";
import { DemandSignals } from "@/components/admin/DemandSignals";
import { MetricCard } from "@/components/admin/MetricCard";
import { RevenueByCategory } from "@/components/admin/RevenueByCategory";
import { RevenueTrend } from "@/components/admin/RevenueTrend";
import { AdminShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatRelativeTime, formatRupees } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { AdminDashboardMetrics } from "@/types";

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

const scoreCardStyles = {
  high: "border-success/20 bg-success/10 text-success",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

function getScoreTier(score: number) {
  if (score >= 75) {
    return "ACTIVE";
  }

  if (score >= 40) {
    return "PENDING";
  }

  return "REVOKED";
}

export function AdminAnalyticsPage() {
  useDocumentTitle("Analytics — SubSplit");
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: getAdminDashboard,
  });
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: getAnalytics,
  });

  const isLoading = isDashboardLoading || isAnalyticsLoading;
  const isError = isDashboardError || isAnalyticsError;

  const scoreCards = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      {
        key: "high",
        label: `High (${analytics.score_distribution.high.range})`,
        count: analytics.score_distribution.high.count,
        className: scoreCardStyles.high,
      },
      {
        key: "medium",
        label: `Medium (${analytics.score_distribution.medium.range})`,
        count: analytics.score_distribution.medium.count,
        className: scoreCardStyles.medium,
      },
      {
        key: "low",
        label: `Low (${analytics.score_distribution.low.range})`,
        count: analytics.score_distribution.low.count,
        className: scoreCardStyles.low,
      },
    ];
  }, [analytics]);

  return (
    <AdminShell>
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-col gap-8 duration-300">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Platform intelligence
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Analytics
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Track category demand, revenue movement, score health, and recent
              user reliability signals in one view.
            </p>
          </div>
        </div>

        {isError ? (
          <ErrorState
            onRetry={() => {
              void refetchDashboard();
              void refetchAnalytics();
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <MetricCard
                      key={index}
                      label=""
                      value=""
                      delta=""
                      loading
                    />
                  ))
                : getMetricCards(dashboard!.metrics).map((metric) => (
                    <MetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      delta={metric.delta}
                    />
                  ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <RevenueByCategory
                revenueByCategory={analytics?.revenue_by_category ?? []}
                slotUtilizationByCategory={
                  analytics?.slot_utilization_by_category ?? []
                }
                usersByCategory={analytics?.users_by_category ?? []}
                loading={isAnalyticsLoading}
              />
              <RevenueTrend
                revenueTrend={analytics?.revenue_trend ?? []}
                loading={isAnalyticsLoading}
              />
            </div>

            <DemandSignals
              demandSignals={analytics?.demand_signals ?? []}
              loading={isAnalyticsLoading}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card>
                <CardHeader className="p-5">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Score distribution</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      A quick view of trust-score concentration across the user
                      base.
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <div className="grid grid-cols-3 gap-3">
                    {isAnalyticsLoading
                      ? Array.from({ length: 3 }, (_, index) => (
                          <Skeleton
                            key={index}
                            className="h-24 w-full rounded-lg"
                          />
                        ))
                      : scoreCards.map((card) => (
                          <div
                            key={card.key}
                            className={cn(
                              "rounded-lg border p-4 text-center",
                              card.className,
                            )}
                          >
                            <p className="text-2xl font-bold tabular-nums">
                              {card.count}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              {card.label}
                            </p>
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-5">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Recent activity</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      The latest score-affecting events across the platform.
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isAnalyticsLoading
                        ? Array.from({ length: 5 }, (_, index) => (
                            <TableRow key={index}>
                              {Array.from(
                                { length: 4 },
                                (__unused, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    <Skeleton className="h-4 w-full max-w-[8rem]" />
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          ))
                        : analytics?.recent_activity.map((activity, index) => (
                            <TableRow
                              key={`${activity.user_name}-${activity.timestamp}-${index}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {activity.user_initials ?? "SS"}
                                  </div>
                                  <span className="text-sm text-foreground">
                                    {activity.user_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[18rem] whitespace-normal text-sm text-muted-foreground">
                                {activity.action}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  status={getScoreTier(activity.subsplit_score)}
                                  label={`${activity.subsplit_score}`}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatRelativeTime(activity.timestamp)}
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
