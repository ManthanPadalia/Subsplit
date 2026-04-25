import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import {
  getAdminPlan,
  getPlanWaitlist,
  revokeSlot,
  updatePlan,
} from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import { AdminShell } from "@/components/layout/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, formatRupees } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { AdminPlanDetail, AdminPlanSlot, UpdatePlanInput } from "@/types";

const planSettingsSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(100),
  description: z.string().trim().min(1, "Description is required"),
  logo_url: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a valid URL",
    ),
  platform_fee_rupees: z
    .number()
    .finite("Platform fee is required")
    .min(0, "Platform fee cannot be negative"),
  access_instructions: z.string().trim(),
  uptime_percentage: z
    .number()
    .finite("Uptime percentage is required")
    .min(0, "Uptime must be between 0 and 100")
    .max(100, "Uptime must be between 0 and 100"),
  is_active: z.boolean(),
});

type PlanSettingsValues = z.infer<typeof planSettingsSchema>;

const defaultValues: PlanSettingsValues = {
  name: "",
  description: "",
  logo_url: "",
  platform_fee_rupees: 0,
  access_instructions: "",
  uptime_percentage: 0,
  is_active: true,
};

function paiseFromRupees(rupees: number) {
  return Math.round(rupees * 100);
}

function getScoreTier(score: number) {
  if (score >= 75) {
    return "ACTIVE";
  }

  if (score >= 40) {
    return "PENDING";
  }

  return "REVOKED";
}

function buildUpdatePayload(
  values: PlanSettingsValues,
  plan: AdminPlanDetail,
): UpdatePlanInput {
  const payload: UpdatePlanInput = {};

  if (values.name.trim() !== plan.name) {
    payload.name = values.name.trim();
  }

  if (values.description.trim() !== plan.description) {
    payload.description = values.description.trim();
  }

  const nextLogoUrl = values.logo_url.trim() || null;
  if (nextLogoUrl !== plan.logo_url) {
    payload.logo_url = nextLogoUrl;
  }

  if (paiseFromRupees(values.platform_fee_rupees) !== plan.platform_fee_paise) {
    payload.platform_fee_paise = paiseFromRupees(values.platform_fee_rupees);
  }

  const nextAccessInstructions = values.access_instructions.trim() || null;
  if (nextAccessInstructions !== plan.access_instructions) {
    payload.access_instructions = nextAccessInstructions;
  }

  if (Number(values.uptime_percentage.toFixed(2)) !== plan.uptime_percentage) {
    payload.uptime_percentage = Number(values.uptime_percentage.toFixed(2));
  }

  if (values.is_active !== plan.is_active) {
    payload.is_active = values.is_active;
  }

  return payload;
}

function getSlotTileClassName(status: AdminPlanSlot["status"]) {
  if (status === "AVAILABLE") {
    return "border-dashed border-border bg-muted/20";
  }

  if (status === "OCCUPIED") {
    return "border-primary/30 bg-primary/5";
  }

  if (status === "GRACE") {
    return "border-warning/30 bg-warning/5";
  }

  return "border-destructive/30 bg-destructive/5";
}

function LoadingSlotTiles() {
  return Array.from({ length: 8 }, (_, index) => (
    <div key={index} className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-full" />
      </div>
    </div>
  ));
}

export function AdminPlanDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanSettingsValues>({
    resolver: zodResolver(planSettingsSchema),
    defaultValues,
  });
  const activeValue = useWatch({ control, name: "is_active" });
  const {
    data: plan,
    isLoading: isPlanLoading,
    isError: isPlanError,
    refetch: refetchPlan,
  } = useQuery({
    queryKey: ["adminPlan", id],
    queryFn: () => getAdminPlan(id ?? ""),
    enabled: Boolean(id),
  });
  const {
    data: waitlist,
    isLoading: isWaitlistLoading,
    isError: isWaitlistError,
    refetch: refetchWaitlist,
  } = useQuery({
    queryKey: ["adminPlanWaitlist", id],
    queryFn: () => getPlanWaitlist(id ?? ""),
    enabled: Boolean(id),
  });
  const headerIsActive = activeValue ?? plan?.is_active ?? true;
  useDocumentTitle(
    plan ? `${plan.name} — SubSplit` : "Plan Settings — SubSplit",
  );

  useEffect(() => {
    if (!plan) {
      return;
    }

    reset({
      name: plan.name,
      description: plan.description,
      logo_url: plan.logo_url ?? "",
      platform_fee_rupees: plan.platform_fee_rupees,
      access_instructions: plan.access_instructions ?? "",
      uptime_percentage: plan.uptime_percentage,
      is_active: plan.is_active,
    });
  }, [plan, reset]);

  const revokeMutation = useMutation({
    mutationFn: ({ slotId, reason }: { slotId: string; reason: string }) =>
      revokeSlot(slotId, reason),
    onSuccess: async (result) => {
      toast.success(
        result.waitlist_promoted
          ? "Slot revoked. The next waitlisted user was promoted."
          : "Slot revoked successfully.",
      );
      setRevokeDialogOpen(false);
      setSelectedSlotId(null);
      setRevokeReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminPlan", id] }),
        queryClient.invalidateQueries({ queryKey: ["adminPlanWaitlist", id] }),
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (payload: UpdatePlanInput) => updatePlan(id ?? "", payload),
    onSuccess: async () => {
      toast.success("Plan updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminPlan", id] }),
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["adminPlans"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const selectedSlot = useMemo(
    () => plan?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [plan?.slots, selectedSlotId],
  );

  const handleOpenRevoke = (slotId: string) => {
    setSelectedSlotId(slotId);
    setRevokeReason("");
    setRevokeDialogOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!plan) {
      return;
    }

    const payload = buildUpdatePayload(values, plan);

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    await updatePlanMutation.mutateAsync(payload);
  });

  if (!id) {
    return (
      <AdminShell>
        <ErrorState message="Plan not found." />
      </AdminShell>
    );
  }

  if (isPlanLoading) {
    return (
      <AdminShell>
        <div className="flex flex-col gap-8">
          <Skeleton className="h-6 w-36" />
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="mt-3 h-4 w-32" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <LoadingSlotTiles />
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-5 h-40 w-full" />
          </div>
        </div>
      </AdminShell>
    );
  }

  if (isPlanError || !plan || isWaitlistError) {
    return (
      <AdminShell>
        <ErrorState
          onRetry={() => {
            void refetchPlan();
            void refetchWaitlist();
          }}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <form className="flex flex-col gap-8" onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <Button asChild variant="ghost" className="w-fit px-0">
            <Link to="/admin">
              <ChevronLeftIcon data-icon="inline-start" />
              Admin dashboard
            </Link>
          </Button>

          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={plan.category} />
                  <StatusBadge
                    status={headerIsActive ? "ACTIVE" : "REVOKED"}
                    label={headerIsActive ? "Active" : "Inactive"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {plan.name}
                  </h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Plan active
                  </p>
                  <p className="text-sm text-foreground">
                    Toggle listing availability for this plan.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">
                Slot grid
              </h2>
              <p className="text-sm text-muted-foreground">
                Review every slot on the plan, including active holders and
                grace-period risks.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {plan.slots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "rounded-lg border p-3",
                    getSlotTileClassName(slot.status),
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Slot {slot.slot_number}
                      </span>
                      <StatusBadge status={slot.status} />
                    </div>

                    {slot.user ? (
                      <>
                        <p className="text-xs font-medium text-foreground">
                          {slot.user.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {slot.user.email}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Score: {slot.user.subsplit_score}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Expires:{" "}
                          {slot.expires_at
                            ? formatDate(slot.expires_at)
                            : "N/A"}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-7 w-full text-xs text-destructive hover:text-destructive"
                          onClick={() => handleOpenRevoke(slot.id)}
                        >
                          Revoke slot
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {slot.status === "REVOKED" ? "Revoked" : "Available"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">
                Plan settings
              </h2>
              <p className="text-sm text-muted-foreground">
                Update plan presentation and pricing details. Category, slot
                count, and base subscription cost stay locked after creation.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Plan name</Label>
                <Input
                  id="name"
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Input value={plan.category} readOnly disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Total slots</Label>
                  <Input value={`${plan.total_slots}`} readOnly disabled />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Subscription cost</Label>
                  <Input
                    value={formatRupees(plan.subscription_cost_paise)}
                    readOnly
                    disabled
                  />
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
                    {...register("platform_fee_rupees", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.platform_fee_rupees ? (
                    <p className="text-xs text-destructive">
                      {errors.platform_fee_rupees.message}
                    </p>
                  ) : null}
                </div>
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="access_instructions">Access instructions</Label>
                <Textarea
                  id="access_instructions"
                  aria-invalid={Boolean(errors.access_instructions)}
                  className={
                    errors.access_instructions ? "border-destructive" : ""
                  }
                  {...register("access_instructions")}
                />
                {errors.access_instructions ? (
                  <p className="text-xs text-destructive">
                    {errors.access_instructions.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="uptime_percentage">Uptime percentage</Label>
                <Input
                  id="uptime_percentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  aria-invalid={Boolean(errors.uptime_percentage)}
                  className={
                    errors.uptime_percentage ? "border-destructive" : ""
                  }
                  {...register("uptime_percentage", {
                    valueAsNumber: true,
                  })}
                />
                {errors.uptime_percentage ? (
                  <p className="text-xs text-destructive">
                    {errors.uptime_percentage.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updatePlanMutation.isPending}
              >
                {updatePlanMutation.isPending ? (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Save changes
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-foreground">
              Waitlist ({waitlist?.total_waiting ?? 0} waiting)
            </h2>
            <p className="text-sm text-muted-foreground">
              Higher-score users stay at the front of the queue when slots open
              up.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isWaitlistLoading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }, (__unused, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full max-w-[7rem]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : waitlist?.waitlist.length ? (
                waitlist.waitlist.map((entry) => (
                  <TableRow key={entry.entry_id}>
                    <TableCell className="text-sm font-bold text-primary">
                      #{entry.position}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {entry.user.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.user.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={getScoreTier(entry.user.subsplit_score)}
                        label={`${entry.user.subsplit_score}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.joined_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No one is waiting for this plan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </form>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this slot?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSlot?.user?.name
                ? `${selectedSlot.user.name}'s slot will be revoked. Score -20. Next waitlisted user promoted.`
                : "This slot will be revoked. Score -20. Next waitlisted user promoted."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="Add context for the revocation."
              className="min-h-24"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={revokeMutation.isPending}
              onClick={() => {
                setSelectedSlotId(null);
                setRevokeReason("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!selectedSlotId || revokeMutation.isPending}
              onClick={() => {
                if (!selectedSlotId) {
                  return;
                }

                revokeMutation.mutate({
                  slotId: selectedSlotId,
                  reason: revokeReason.trim(),
                });
              }}
            >
              {revokeMutation.isPending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Revoke slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
