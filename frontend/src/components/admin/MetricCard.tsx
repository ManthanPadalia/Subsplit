import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  delta,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-3 w-24" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="mt-3 h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs text-success">{delta}</p>
      </CardContent>
    </Card>
  );
}
