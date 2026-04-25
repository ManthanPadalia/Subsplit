import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RevenueTrendPoint } from "@/types";

interface RevenueTrendProps {
  revenueTrend: RevenueTrendPoint[];
  loading?: boolean;
}

function formatMonth(month: string) {
  const [year, monthValue] = month.split("-");
  const date = new Date(Number(year), Number(monthValue) - 1, 1);

  return date.toLocaleString("en-IN", { month: "short" });
}

export function RevenueTrend({
  revenueTrend,
  loading = false,
}: RevenueTrendProps) {
  const trendData = useMemo(
    () =>
      revenueTrend.slice(-6).map((point) => ({
        ...point,
        monthLabel: formatMonth(point.month),
      })),
    [revenueTrend],
  );

  const latestIndex = trendData.length - 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-5">
        <div className="flex flex-col gap-1">
          <CardTitle>Revenue trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monthly revenue for the last six recorded months.
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={trendData}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) =>
                  `₹${(value / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(value) =>
                  `₹${Number(value ?? 0).toLocaleString("en-IN")}`
                }
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue_rupees" radius={[4, 4, 0, 0]}>
                {trendData.map((point, index) => (
                  <Cell
                    key={point.month}
                    fill="#6C47FF"
                    fillOpacity={index === latestIndex ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
