import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/api/client";
import { getMyWaitlist, joinWaitlist, leaveWaitlist } from "@/api/waitlist";

export function useMyWaitlist() {
  return useQuery({
    queryKey: ["waitlist"],
    queryFn: getMyWaitlist,
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinWaitlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Joined waitlist");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useLeaveWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveWaitlist,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Left waitlist");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
