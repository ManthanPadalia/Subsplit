import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createPlan } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanCategory } from "@/types";

const categoryOptions: Array<{ label: string; value: PlanCategory }> = [
  { label: "Streaming", value: "STREAMING" },
  { label: "Education", value: "EDUCATION" },
  { label: "Gaming", value: "GAMING" },
  { label: "Productivity", value: "PRODUCTIVITY" },
  { label: "Music", value: "MUSIC" },
];

const addPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  category: z.enum(
    categoryOptions.map((option) => option.value) as [
      PlanCategory,
      ...PlanCategory[],
    ],
  ),
  description: z.string().trim().min(1, "Description is required"),
  logo_url: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a valid URL",
    ),
  total_slots: z
    .number()
    .finite("Total slots is required")
    .int("Enter a whole number")
    .min(1, "Enter at least 1 slot"),
  subscription_cost_rupees: z
    .number()
    .finite("Subscription cost is required")
    .positive("Subscription cost must be greater than 0"),
  platform_fee_rupees: z
    .number()
    .finite("Platform fee is required")
    .min(0, "Platform fee cannot be negative"),
  access_instructions: z
    .string()
    .trim()
    .min(1, "Access instructions are required"),
});

type AddPlanFormValues = z.infer<typeof addPlanSchema>;

interface AddPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: AddPlanFormValues = {
  name: "",
  category: "STREAMING",
  description: "",
  logo_url: "",
  total_slots: 4,
  subscription_cost_rupees: 0,
  platform_fee_rupees: 0,
  access_instructions: "",
};

function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

function formatPreviewValue(value: number) {
  return `₹${value.toFixed(2)}/mo`;
}

export function AddPlanDialog({ open, onOpenChange }: AddPlanDialogProps) {
  const queryClient = useQueryClient();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPlanFormValues>({
    resolver: zodResolver(addPlanSchema),
    defaultValues,
  });

  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: async (plan) => {
      toast.success(`Plan created with ${plan.total_slots} slots.`);
      reset(defaultValues);
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["adminPlans"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const totalSlots = useWatch({ control, name: "total_slots" });
  const subscriptionCostRupees = useWatch({
    control,
    name: "subscription_cost_rupees",
  });
  const platformFeeRupees = useWatch({
    control,
    name: "platform_fee_rupees",
  });
  const safeSlots = totalSlots > 0 ? totalSlots : 1;
  const slotCost =
    subscriptionCostRupees > 0 ? subscriptionCostRupees / safeSlots : 0;
  const userPays = slotCost + Math.max(platformFeeRupees || 0, 0);

  const onSubmit = handleSubmit(async (values) => {
    await createPlanMutation.mutateAsync({
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      logo_url: values.logo_url.trim() || null,
      total_slots: values.total_slots,
      subscription_cost_paise: rupeesToPaise(values.subscription_cost_rupees),
      platform_fee_paise: rupeesToPaise(values.platform_fee_rupees),
      access_instructions: values.access_instructions.trim(),
    });
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !createPlanMutation.isPending) {
      reset(defaultValues);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add plan</DialogTitle>
          <DialogDescription>
            Create a new subscription plan and generate its slot inventory.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Plan name</Label>
              <Input
                id="name"
                placeholder="YouTube Premium Family"
                aria-invalid={Boolean(errors.name)}
                className={errors.name ? "border-destructive" : ""}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                aria-invalid={Boolean(errors.category)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("category")}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="text-xs text-destructive">
                  {errors.category.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what the user gets with this subscription."
              aria-invalid={Boolean(errors.description)}
              className={errors.description ? "border-destructive" : ""}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              placeholder="https://example.com/logo.svg"
              aria-invalid={Boolean(errors.logo_url)}
              className={errors.logo_url ? "border-destructive" : ""}
              {...register("logo_url")}
            />
            {errors.logo_url ? (
              <p className="text-xs text-destructive">
                {errors.logo_url.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_slots">Total slots</Label>
              <Input
                id="total_slots"
                type="number"
                min={1}
                step={1}
                aria-invalid={Boolean(errors.total_slots)}
                className={errors.total_slots ? "border-destructive" : ""}
                {...register("total_slots", { valueAsNumber: true })}
              />
              {errors.total_slots ? (
                <p className="text-xs text-destructive">
                  {errors.total_slots.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subscription_cost_rupees">
                Subscription cost (₹)
              </Label>
              <Input
                id="subscription_cost_rupees"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={Boolean(errors.subscription_cost_rupees)}
                className={
                  errors.subscription_cost_rupees ? "border-destructive" : ""
                }
                {...register("subscription_cost_rupees", {
                  valueAsNumber: true,
                })}
              />
              {errors.subscription_cost_rupees ? (
                <p className="text-xs text-destructive">
                  {errors.subscription_cost_rupees.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="platform_fee_rupees">Platform fee (₹)</Label>
              <Input
                id="platform_fee_rupees"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={Boolean(errors.platform_fee_rupees)}
                className={
                  errors.platform_fee_rupees ? "border-destructive" : ""
                }
                {...register("platform_fee_rupees", { valueAsNumber: true })}
              />
              {errors.platform_fee_rupees ? (
                <p className="text-xs text-destructive">
                  {errors.platform_fee_rupees.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Slot cost</span>
              <span>{formatPreviewValue(slotCost)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>+ Platform fee</span>
              <span>
                {formatPreviewValue(Math.max(platformFeeRupees || 0, 0))}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm font-medium text-foreground">
              <span>User pays</span>
              <span>{formatPreviewValue(userPays)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access_instructions">Access instructions</Label>
            <Textarea
              id="access_instructions"
              placeholder="Explain how SubSplit will deliver access for this plan."
              aria-invalid={Boolean(errors.access_instructions)}
              className={errors.access_instructions ? "border-destructive" : ""}
              {...register("access_instructions")}
            />
            {errors.access_instructions ? (
              <p className="text-xs text-destructive">
                {errors.access_instructions.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createPlanMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPlanMutation.isPending}>
              {createPlanMutation.isPending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Create plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
