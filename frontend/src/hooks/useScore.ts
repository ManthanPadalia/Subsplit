import { useQuery } from "@tanstack/react-query";

import { getMyScore } from "@/api/scores";

export function useMyScore() {
  return useQuery({
    queryKey: ["score"],
    queryFn: getMyScore,
  });
}
