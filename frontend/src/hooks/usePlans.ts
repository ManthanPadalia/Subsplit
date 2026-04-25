import { useQuery } from "@tanstack/react-query";

import { getPlan, getPlans } from "@/api/plans";
import type { PlanCategory } from "@/types";

const TWO_MINUTES_IN_MS = 1000 * 60 * 2;

export function usePlans(category?: PlanCategory | "ALL") {
  return useQuery({
    queryKey: ["plans", category],
    queryFn: () => getPlans(category),
    staleTime: TWO_MINUTES_IN_MS,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ["plan", id],
    queryFn: () => getPlan(id),
    staleTime: TWO_MINUTES_IN_MS,
    enabled: Boolean(id),
  });
}
