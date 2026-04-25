import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  OCCUPIED: "bg-success/10 text-success border-success/20",
  SUCCESS: "bg-success/10 text-success border-success/20",
  GRACE: "bg-warning/10 text-warning border-warning/20",
  PENDING: "bg-warning/10 text-warning border-warning/20",
  WARNING: "bg-warning/10 text-warning border-warning/20",
  REVOKED: "bg-destructive/10 text-destructive border-destructive/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
  AVAILABLE: "bg-muted text-muted-foreground border-border",
  STREAMING: "bg-primary/10 text-primary border-primary/20",
  EDUCATION: "bg-secondary text-secondary-foreground border-border",
  GAMING: "bg-accent text-accent-foreground border-border",
  PRODUCTIVITY: "bg-warning/10 text-warning border-warning/20",
  MUSIC: "bg-success/10 text-success border-success/20",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded border inline-flex items-center",
        statusStyles[normalizedStatus] ??
          "bg-muted text-muted-foreground border-border",
      )}
    >
      {label ?? status}
    </Badge>
  );
}
