import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatRupees } from "@/lib/utils";
import { useMyPayments } from "@/hooks/usePayments";
import { Skeleton } from "@/components/ui/skeleton";

export function PaymentHistory() {
  const { data, isLoading } = useMyPayments();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!data?.payments.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
        No payment history yet.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(payment.created_at)}
              </TableCell>
              <TableCell className="text-sm font-medium text-foreground">
                {payment.plan.name}
              </TableCell>
              <TableCell className="text-sm tabular-nums text-foreground">
                {formatRupees(payment.amount_paise)}
              </TableCell>
              <TableCell>
                <StatusBadge status={payment.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
