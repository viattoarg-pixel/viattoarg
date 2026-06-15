import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { BudgetProgress } from "@/components/BudgetProgress";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { useBudgets, useActiveBudget } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Wallet, Receipt, TrendingDown, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function Dashboard() {
  const { data: budgets, isLoading: bLoading } = useBudgets();
  const active = useActiveBudget();
  const { data: expenses, isLoading: eLoading } = useExpenses(active?.id);
  const { data: categories } = useCategories();

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map(c => [c.id, c])),
    [categories]
  );

  const totalSpent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const max = Number(active?.max_amount ?? 0);
  const currency = active?.currency ?? "ARS";

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    for (const e of expenses ?? []) {
      const cat = e.category_id ? categoryMap.get(e.category_id) : null;
      const key = cat?.id ?? "none";
      const name = cat?.name ?? "Sin categoría";
      const color = cat?.color ?? "hsl(var(--muted-foreground))";
      const prev = map.get(key);
      map.set(key, { name, color, value: (prev?.value ?? 0) + Number(e.amount) });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [expenses, categoryMap]);

  const recent = (expenses ?? []).slice(0, 6);
  const loading = bLoading || eLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Resumen</h1>
          <Button asChild size="sm" className="h-7 text-[12px] gap-1.5">
            <Link to="/expenses/new"><Plus className="h-3.5 w-3.5" /> Nuevo gasto</Link>
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !active ? (
              <div className="border border-dashed border-border rounded-md p-8 text-center space-y-3">
                <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-[14px] font-medium">No tenés un presupuesto activo</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Creá un presupuesto para empezar a registrar tus viáticos.</p>
                </div>
                <Button asChild size="sm"><Link to="/budgets">Crear presupuesto</Link></Button>
              </div>
            ) : (
              <>
                {/* Active budget card */}
                <div className="border border-border rounded-md p-5 space-y-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Presupuesto activo</p>
                      <h2 className="text-[18px] font-medium mt-1">{active.name}</h2>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-[12px]">
                      <Link to="/budgets">Cambiar</Link>
                    </Button>
                  </div>
                  <BudgetProgress max={max} spent={totalSpent} currency={currency} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
                  {[
                    { label: "Tope total", value: formatCurrency(max, currency), icon: Wallet },
                    { label: "Gastado", value: formatCurrency(totalSpent, currency), icon: TrendingDown },
                    { label: "Gastos cargados", value: String(expenses?.length ?? 0), icon: Receipt },
                  ].map(s => (
                    <div key={s.label} className="bg-background p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <s.icon className="h-3.5 w-3.5" />
                        <p className="text-[12px]">{s.label}</p>
                      </div>
                      <p className="text-xl font-medium mt-1 tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart + recent */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
                  <div className="bg-background p-4">
                    <p className="text-[13px] font-medium mb-3">Gastos por categoría</p>
                    {byCategory.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground py-8 text-center">Aún no hay gastos cargados.</p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="50%" height={180}>
                          <PieChart>
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                              formatter={(v: number) => formatCurrency(v, currency)}
                            />
                            <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                              {byCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <ul className="flex-1 space-y-1.5">
                          {byCategory.map(c => (
                            <li key={c.name} className="flex items-center justify-between text-[12px]">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                                {c.name}
                              </span>
                              <span className="tabular-nums text-muted-foreground">{formatCurrency(c.value, currency)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-background p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-medium">Últimos gastos</p>
                      <Link to="/expenses" className="text-[12px] text-muted-foreground hover:text-foreground">Ver todos →</Link>
                    </div>
                    {recent.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground py-8 text-center">Aún no hay gastos cargados.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {recent.map(e => (
                          <li key={e.id}>
                            <Link to={`/expenses/${e.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] truncate">{e.description || "Sin descripción"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <CategoryBadge category={e.category_id ? categoryMap.get(e.category_id) : null} />
                                  <span className="text-[11px] text-muted-foreground">{formatDate(e.expense_date)}</span>
                                </div>
                              </div>
                              <p className="text-[13px] font-medium tabular-nums shrink-0">{formatCurrency(Number(e.amount), currency)}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
