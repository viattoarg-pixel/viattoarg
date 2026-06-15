import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface Props {
  max: number;
  spent: number;
  currency?: string;
  showLabels?: boolean;
}

export function BudgetProgress({ max, spent, currency = "ARS", showLabels = true }: Props) {
  const pct = max > 0 ? Math.min(100, (spent / max) * 100) : 0;
  const over = spent > max;
  const remaining = max - spent;

  const color =
    pct >= 90 || over
      ? "bg-destructive"
      : pct >= 70
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="space-y-2">
      {showLabels && (
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">
            {formatCurrency(spent, currency)} de {formatCurrency(max, currency)}
          </span>
          <span className={cn("font-medium tabular-nums", over && "text-destructive")}>
            {pct.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabels && (
        <p className={cn("text-[12px]", over ? "text-destructive font-medium" : "text-muted-foreground")}>
          {over
            ? `Excediste el tope por ${formatCurrency(Math.abs(remaining), currency)}`
            : `Disponible: ${formatCurrency(remaining, currency)}`}
        </p>
      )}
    </div>
  );
}
