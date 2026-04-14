import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/layout/AppShell";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const signupSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) {
    return 0;
  }

  const hasLetters = /[A-Za-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (password.length >= 12 && hasLetters && hasNumbers && hasSpecialChar) {
    return 3;
  }

  if (password.length >= 8 && hasLetters && hasNumbers) {
    return 2;
  }

  return 1;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated, setAuth, registerMutation } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });
  const strength = getPasswordStrength(password);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await registerMutation.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      setAuth(response.user, response.access_token);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
          <div className="text-center">
            <Link to="/" className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Sub</span>
              <span className="text-primary">Split</span>
            </Link>
            <h1 className="mt-6 text-2xl font-semibold text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start saving on subscriptions today
            </p>
          </div>

          <form className="mt-8 flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Manthan Patel"
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

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                className={errors.email ? "border-destructive" : ""}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  className={
                    errors.password ? "border-destructive pr-10" : "pr-10"
                  }
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {password ? (
                <div className="mt-1 space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          index < strength
                            ? strength === 1
                              ? "bg-destructive"
                              : strength === 2
                                ? "bg-warning"
                                : "bg-success"
                            : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {["", "Weak", "Medium", "Strong"][strength]}
                  </p>
                </div>
              ) : null}
              {errors.password ? (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.confirmPassword)}
                className={errors.confirmPassword ? "border-destructive" : ""}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Sign up
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
