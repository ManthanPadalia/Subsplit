import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { CategoryFilter } from "@/components/plans/CategoryFilter";
import { PlanCard } from "@/components/plans/PlanCard";
import { PlanCardSkeleton } from "@/components/plans/PlanCardSkeleton";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePlans } from "@/hooks/usePlans";
import type { PlanCategory } from "@/types";

export function BrowsePlansPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | PlanCategory
  >("ALL");
  const { data, isLoading, isError, refetch } = usePlans(selectedCategory);

  return (
    <AppShell>
      <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Browse subscription plans
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            All plans are SubSplit-owned. Your slot is guaranteed.
          </p>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {isLoading ? <PlanCardSkeleton count={6} /> : null}

        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}

        {!isLoading && !isError && !data?.plans.length ? (
          <EmptyState
            icon={SearchIcon}
            title="No plans in this category"
            description="Check back soon — we're adding new plans regularly."
            action={{
              label: "View all plans",
              variant: "outline",
              onClick: () => setSelectedCategory("ALL"),
            }}
          />
        ) : null}

        {!isLoading && !isError && data?.plans.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
