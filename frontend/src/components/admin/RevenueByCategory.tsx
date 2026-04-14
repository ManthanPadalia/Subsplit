import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  RevenueByCategory as RevenueByCategoryItem,
  SlotUtilizationByCategory,
  UsersByCategory,
} from "@/types";

type RevenueTab = "Revenue" | "Utilization" | "Users";

interface RevenueByCategoryProps {
  revenueByCategory: RevenueByCategoryItem[];
  slotUtilizationByCategory: SlotUtilizationByCategory[];
  usersByCategory: UsersByCategory[];
  loading?: boolean;
}

function formatCategory(category: string) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function RevenueByCategory({
  revenueByCategory,
  slotUtilizationByCategory,
  usersByCategory,
  loading = false,
}: RevenueByCategoryProps) {
  const [activeTab, setActiveTab] = useState<RevenueTab>("Revenue");

  const chartData = useMemo(() => {
    if (activeTab === "Revenue") {
      return revenueByCategory.map((item) => ({
        category: formatCategory(item.category),
        value: item.revenue_rupees,
      }));
    }

    if (activeTab === "Utilization") {
      return slotUtilizationByCategory.map((item) => ({
        category: formatCategory(item.category),
        value: Number(item.utilization_percentage.toFixed(2)),
      }));
    }

    return usersByCategory.map((item) => ({
      category: formatCategory(item.category),
      value: item.user_count,
    }));
  }, [
    activeTab,
    revenueByCategory,
    slotUtilizationByCategory,
    usersByCategory,
  ]);

  const formatValue = (value: number) => {
    if (activeTab === "Revenue") {
      return `₹${value.toLocaleString("en-IN")}`;
    }

    if (activeTab === "Utilization") {
      return `${value.toFixed(1)}%`;
    }

    return value.toLocaleString("en-IN");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Revenue by category</CardTitle>
          <p className="text-sm text-muted-foreground">
            Switch between revenue, utilization, and user count by category.
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {(["Revenue", "Utilization", "Users"] as RevenueTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 24, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11 }}
                width={88}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                formatter={(value) => formatValue(Number(value ?? 0))}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill="#6C47FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
