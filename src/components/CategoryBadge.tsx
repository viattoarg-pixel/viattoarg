import type { Category } from "@/hooks/useCategories";

export function CategoryBadge({ category }: { category?: Category | null }) {
  if (!category) {
    return <span className="text-[11px] text-muted-foreground">Sin categoría</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border"
      style={{
        borderColor: category.color,
        color: category.color,
        backgroundColor: `${category.color.replace("hsl(", "hsl(").replace(")", " / 0.1)")}`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  );
}
