import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cancelSlot, getMySlots } from "@/api/slots";
import { getErrorMessage } from "@/api/client";
import type { SlotStatus } from "@/types";

export function useMySlots(status?: SlotStatus) {
  return useQuery({
    queryKey: ["slots", status],
    queryFn: () => getMySlots(status),
  });
}

export function useCancelSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSlot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Slot cancelled successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
