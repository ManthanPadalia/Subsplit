import { cn } from "@/lib/utils";
import type { PlanCategory } from "@/types";

type CategoryValue = "ALL" | PlanCategory;

interface CategoryOption {
  label: string;
  value: CategoryValue;
}

interface CategoryFilterProps {
  selectedCategory: CategoryValue;
  onSelect: (category: CategoryValue) => void;
}

const categoryOptions: CategoryOption[] = [
  { label: "All", value: "ALL" },
  { label: "Streaming", value: "STREAMING" },
  { label: "Education", value: "EDUCATION" },
  { label: "Gaming", value: "GAMING" },
  { label: "Productivity", value: "PRODUCTIVITY" },
  { label: "Music", value: "MUSIC" },
];

export function CategoryFilter({
  selectedCategory,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="mt-6 mb-8 flex flex-wrap gap-2">
      {categoryOptions.map((category) => {
        const isActive = selectedCategory === category.value;

        return (
          <button
            key={category.value}
            type="button"
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50",
            )}
            onClick={() => onSelect(category.value)}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
