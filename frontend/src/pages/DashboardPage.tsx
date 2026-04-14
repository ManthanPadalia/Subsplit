import { PackageIcon } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { ActiveSlotCard } from "@/components/dashboard/ActiveSlotCard";
import { PaymentHistory } from "@/components/dashboard/PaymentHistory";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { WaitlistTab } from "@/components/dashboard/WaitlistTab";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useMyScore } from "@/hooks/useScore";
import { useMySlots } from "@/hooks/useSlots";
import { useMyWaitlist } from "@/hooks/useWaitlist";
import { formatDate } from "@/lib/utils";

function getScoreTier(score: number) {
  if (score >= 75) {
    return "High";
  }
  if (score >= 40) {
    return "Medium";
  }
  return "Low";
}

function getScoreTierClasses(score: number) {
  if (score >= 75) {
    return "bg-success/10 text-success border-success/20";
  }

  if (score >= 40) {
    return "bg-warning/10 text-warning border-warning/20";
  }

  return "bg-destructive/10 text-destructive border-destructive/20";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { data: slotsData, isLoading: slotsLoading } = useMySlots();
  const { data: waitlistData } = useMyWaitlist();
  const { data: scoreData } = useMyScore();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          `${location.pathname}${location.search}`,
        )}`}
        replace
      />
    );
  }

  const activeSlots =
    slotsData?.slots.filter((slot) => slot.status === "OCCUPIED") ?? [];
  const allSlots = slotsData?.slots ?? [];
  const waitlistCount = waitlistData?.waitlist_entries.length ?? 0;
  const score = scoreData?.subsplit_score ?? 0;
  const scoreTier = getScoreTier(score);

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.name}
          </p>
        </div>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="w-full md:max-w-md">
            <ScoreRing />
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active slots
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {activeSlots.length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Member since
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatDate(user.created_at)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                SubSplit Score
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {score}
                </p>
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${getScoreTierClasses(
                    score,
                  )}`}
                >
                  {scoreTier}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="subscriptions">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value="subscriptions"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Active subscriptions
              {activeSlots.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                  {activeSlots.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Payment history
            </TabsTrigger>
            <TabsTrigger
              value="waitlist"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Waitlist
              {waitlistCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {waitlistCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="mt-4">
            {slotsLoading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-56 w-full rounded-lg" />
                <Skeleton className="h-56 w-full rounded-lg" />
              </div>
            ) : allSlots.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title="No active subscriptions"
                description="Browse plans to find your first slot."
                action={{
                  label: "Browse plans",
                  onClick: () => navigate("/plans"),
                }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {allSlots.map((slot) => (
                  <ActiveSlotCard key={slot.id} slot={slot} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentHistory />
          </TabsContent>

          <TabsContent value="waitlist" className="mt-4">
            <WaitlistTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
