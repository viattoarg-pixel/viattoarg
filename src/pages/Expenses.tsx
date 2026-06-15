import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgets, useActiveBudget } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Search, Paperclip, Loader2 } from "lucide-react";

export default function Expenses() {
  const { data: budgets } = useBudgets();
  const active = useActiveBudget();
  const [budgetId, setBudgetId] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const effectiveBudgetId = budgetId === "all" ? undefined : budgetId === "active" ? active?.id : budgetId;
  const { data: expenses, isLoading } = useExpenses(effectiveBudgetId);
  const { data: categories } = useCategories();
  const categoryMap = useMemo(() => new Map((categories ?? []).map(c => [c.id, c])), [categories]);
  const budgetMap = useMemo(() => new Map((budgets ?? []).map(b => [b.id, b])), [budgets]);

  const filtered = (expenses ?? []).filter(e => {
    const matchSearch = !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      String(e.amount).includes(search);
    const matchCat = categoryFilter === "all" ||
      (categoryFilter === "none" ? !e.category_id : e.category_id === categoryFilter);
    return matchSearch && matchCat;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const currency = effectiveBudgetId ? budgetMap.get(effectiveBudgetId)?.currency ?? "ARS" : "ARS";

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Gastos</h1>
          <Button asChild size="sm" className="h-7 text-[12px] gap-1.5">
            <Link to="/expenses/new"><Plus className="h-3.5 w-3.5" /> Nuevo gasto</Link>
          </Button>
        </div>

        <div className="p-4 md:p-6 space-y-4 max-w-[1200px] w-full">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar gasto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-[13px]" />
            </div>
            <Select value={budgetId} onValueChange={setBudgetId}>
              <SelectTrigger className="h-8 text-[12px] w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Presupuesto activo</SelectItem>
                <SelectItem value="all">Todos los presupuestos</SelectItem>
                {(budgets ?? []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-[12px] w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="none">Sin categoría</SelectItem>
                {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto text-[12px] text-muted-foreground">
              Total: <span className="font-medium text-foreground tabular-nums">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Fecha</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Descripción</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Categoría</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="h-4 w-4 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-[13px]">No hay gastos para mostrar</td></tr>
                ) : (
                  filtered.map(e => {
                    const bCurrency = budgetMap.get(e.budget_id)?.currency ?? "ARS";
                    return (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                        <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                          <Link to={`/expenses/${e.id}`} className="block">{formatDate(e.expense_date)}</Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link to={`/expenses/${e.id}`} className="flex items-center gap-2">
                            <span className="font-medium">{e.description || <span className="text-muted-foreground italic">Sin descripción</span>}</span>
                            {e.receipt_url && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Link to={`/expenses/${e.id}`} className="block">
                            <CategoryBadge category={e.category_id ? categoryMap.get(e.category_id) : null} />
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap">
                          <Link to={`/expenses/${e.id}`} className="block">{formatCurrency(Number(e.amount), bCurrency)}</Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
