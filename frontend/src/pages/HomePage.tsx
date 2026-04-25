import {
  BadgeCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PlanCard } from "@/components/plans/PlanCard";
import { PlanCardSkeleton } from "@/components/plans/PlanCardSkeleton";
import { SavingsCalculator } from "@/components/plans/SavingsCalculator";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePlans } from "@/hooks/usePlans";

const steps = [
  {
    step: "1",
    title: "Browse plans",
    description:
      "Choose from Streaming, Education, Gaming, Productivity, or Music subscriptions.",
  },
  {
    step: "2",
    title: "Pick your slot",
    description:
      "See exactly how many slots are available and what you'll pay. Transparent pricing, always.",
  },
  {
    step: "3",
    title: "Get instant access",
    description:
      "Pay securely. Your slot is activated immediately. Cancel anytime.",
  },
];

const trustCards = [
  {
    title: "We own every account",
    description: "SubSplit purchases and manages all subscriptions directly.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Transparent pricing",
    description:
      "See the exact math: subscription cost ÷ slots + our small fee.",
    icon: WalletCardsIcon,
  },
  {
    title: "Slot guarantee",
    description: "If access breaks, we fix it or refund you. No excuses.",
    icon: BadgeCheckIcon,
  },
  {
    title: "Trust score system",
    description:
      "Your SubSplit Score rewards reliable users with waitlist priority.",
    icon: SparklesIcon,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePlans();
  useDocumentTitle("SubSplit — Pay only for the slot you use");

  const featuredPlans = data?.plans.slice(0, 3) ?? [];

  const scrollToSavings = () => {
    document
      .getElementById("savings-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppShell>
      <div className="flex flex-col">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <div className="h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary">
              Subscription sharing, reimagined
            </p>

            <h1 className="text-5xl font-bold leading-none tracking-tight text-foreground md:text-6xl">
              Pay only for
              <br />
              the <span className="text-primary">slot</span> you use.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              SubSplit buys the subscription. You get a guaranteed, working slot
              at a fraction of the cost. No random users. No broken access. Just
              your slot.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/plans")}>
                Browse plans
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToSavings}>
                See my savings
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              {[
                "SubSplit-owned accounts",
                "Instant slot access",
                "Cancel anytime",
              ].map((item) => (
                <div key={item} className="inline-flex items-center gap-2">
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckIcon className="size-3" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-2xl font-semibold text-foreground">
              How SubSplit works
            </h2>
            <p className="mb-12 text-center text-sm text-muted-foreground">
              Three steps to start saving
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="bg-card border border-border rounded-lg p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="savings-calculator"
          className="border-t border-border py-16"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              See how much you save
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Compare what you pay alone versus what you pay when SubSplit owns
              the subscription and sells only the slots.
            </p>
          </div>

          <SavingsCalculator />
        </section>

        <section className="border-t border-border py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              Most popular plans
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A quick look at the plans users join most often.
            </p>
          </div>

          {isLoading ? <PlanCardSkeleton count={6} /> : null}

          {isError ? <ErrorState onRetry={() => void refetch()} /> : null}

          {!isLoading && !isError && featuredPlans.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              title="No featured plans available"
              description="Plans will appear here once the catalog is populated."
              action={{
                label: "Browse all plans",
                onClick: () => navigate("/plans"),
              }}
            />
          ) : null}

          {!isLoading && !isError && featuredPlans.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={() => navigate("/plans")}>
                  Browse all plans
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </>
          ) : null}
        </section>

        <section className="-mx-4 border-t border-border bg-muted/30 px-4 py-16 md:-mx-8 md:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-semibold text-foreground">
              Why SubSplit is different
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {trustCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
