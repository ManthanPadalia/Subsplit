import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface SubscriptionOption {
  id: number;
  name: string;
  solo: number;
  split: number;
  category: string;
}

const subscriptions: SubscriptionOption[] = [
  {
    id: 1,
    name: "Netflix Premium",
    solo: 649,
    split: 199,
    category: "Streaming",
  },
  {
    id: 2,
    name: "Spotify Family",
    solo: 179,
    split: 49,
    category: "Music",
  },
  {
    id: 3,
    name: "Amazon Prime",
    solo: 299,
    split: 99,
    category: "Streaming",
  },
  {
    id: 4,
    name: "Adobe Creative Cloud",
    solo: 4230,
    split: 1499,
    category: "Productivity",
  },
  {
    id: 5,
    name: "Microsoft 365",
    solo: 489,
    split: 119,
    category: "Productivity",
  },
  {
    id: 6,
    name: "Coursera Plus",
    solo: 3800,
    split: 999,
    category: "Education",
  },
  {
    id: 7,
    name: "Xbox Game Pass",
    solo: 499,
    split: 169,
    category: "Gaming",
  },
];

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function SavingsCalculator() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const totals = useMemo(() => {
    const selectedSubscriptions = subscriptions.filter((subscription) =>
      selectedIds.includes(subscription.id),
    );

    const soloAnnual =
      selectedSubscriptions.reduce(
        (total, subscription) => total + subscription.solo,
        0,
      ) * 12;
    const splitAnnual =
      selectedSubscriptions.reduce(
        (total, subscription) => total + subscription.split,
        0,
      ) * 12;
    const savings = soloAnnual - splitAnnual;
    const percentage =
      soloAnnual > 0 ? Math.round((savings / soloAnnual) * 100) : 0;

    return {
      soloAnnual,
      splitAnnual,
      savings,
      percentage,
    };
  }, [selectedIds]);

  const toggleSelection = (subscriptionId: number) => {
    setSelectedIds((current) =>
      current.includes(subscriptionId)
        ? current.filter((id) => id !== subscriptionId)
        : [...current, subscriptionId],
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-8 max-w-2xl mx-auto">
      <div className="grid gap-8 md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="mb-4 text-sm font-medium text-foreground">
            Select the subscriptions you use:
          </p>

          <div className="flex flex-col">
            {subscriptions.map((subscription) => {
              const isChecked = selectedIds.includes(subscription.id);

              return (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between border-b border-border py-2 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleSelection(subscription.id)}
                    />
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => toggleSelection(subscription.id)}
                    >
                      <p className="text-sm text-foreground">
                        {subscription.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subscription.category}
                      </p>
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(subscription.solo)}/mo solo
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your annual cost comparison
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Solo/year</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {formatCurrency(totals.soloAnnual)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">SubSplit/year</p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {formatCurrency(totals.splitAnnual)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">You save/year</p>
                <div className="mt-1 text-lg font-bold text-success">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={totals.savings}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="block"
                    >
                      {formatCurrency(totals.savings)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Typical SubSplit savings
                </p>
                <p className="text-sm text-muted-foreground">
                  Pick the plans you use and compare yearly spend instantly.
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                {totals.percentage}% saved
              </span>
            </div>
          </div>

          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => navigate("/signup")}
          >
            Start saving — create your account
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
