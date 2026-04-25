import { cn } from "@/lib/utils";

interface SlotDotProps {
  filled: boolean;
  className?: string;
}

export function SlotDot({ filled, className }: SlotDotProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-2.5 h-2.5 rounded-sm",
        filled ? "bg-primary" : "bg-muted border border-border",
        className,
      )}
    />
  );
}
