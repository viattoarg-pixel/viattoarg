import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useActiveBudget, useUpdateBudget, useCreateBudget } from "@/hooks/useBudgets";
import { useExpenses, useDeleteExpense } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadExpensePdf, downloadExpensesReportPdf } from "@/lib/pdf";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Image as ImageIcon, Download, Calendar, Utensils, Loader2, Leaf,
} from "lucide-react";

export default function Expenses() {
  const active = useActiveBudget();
  const { data: expenses, isLoading } = useExpenses(active?.id);
  const { data: categories } = useCategories();
  const del = useDeleteExpense();
  const categoryMap = useMemo(() => new Map((categories ?? []).map(c => [c.id, c])), [categories]);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editTopeOpen, setEditTopeOpen] = useState(false);

  const filtered = (expenses ?? []).filter(e => {
    const matchSearch = !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      String(e.amount).includes(search);
    const matchDate = !dateFilter || e.expense_date === dateFilter;
    return matchSearch && matchDate;
  });

  const spent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const max = Number(active?.max_amount ?? 0);
  const remaining = Math.max(max - spent, 0);
  const pct = max > 0 ? Math.min((spent / max) * 100, 100) : 0;
  const currency = active?.currency ?? "ARS";

  const handleDownloadOne = async (e: any) => {
    const catName = e.category_id ? categoryMap.get(e.category_id)?.name : null;
    const pdfUser = { full_name: profile?.full_name ?? null, email: user?.email ?? null };
    toast.promise(
      downloadExpensePdf({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        expense_date: e.expense_date,
        receipt_url: e.receipt_url,
        category_name: catName,
      }, currency, pdfUser),
      { loading: "Generando PDF...", success: "PDF descargado", error: "Error al generar PDF" }
    );
  };

  const handleDownloadAll = async () => {
    const pdfUser = { full_name: profile?.full_name ?? null, email: user?.email ?? null };
    toast.promise(
      downloadExpensesReportPdf({
        budget: active ? { name: active.name, max_amount: max, currency } : null,
        spent,
        remaining,
        currency,
        user: pdfUser,
        expenses: filtered.map(e => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          expense_date: e.expense_date,
          receipt_url: e.receipt_url,
          category_name: e.category_id ? categoryMap.get(e.category_id)?.name ?? null : null,
        })),
      }),
      { loading: "Generando PDF...", success: "PDF descargado", error: "Error al generar PDF" }
    );
  };

  const viewReceipt = async (path: string) => {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Gastos</h1>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[12px] gap-1.5"
            onClick={handleDownloadAll}
            disabled={!active || filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Descargar PDF
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5 max-w-[1200px] w-full">
          {/* Budget hero card */}
          {!active ? (
            <NoBudget />
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-brand text-primary-foreground p-6 md:p-8 shadow-float">
              <div className="absolute -right-12 -bottom-12 opacity-[0.10] pointer-events-none">
                <Leaf className="h-64 w-64" />
              </div>
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="text-[11px] tracking-widest uppercase text-primary-foreground/70 font-medium">Tope máximo disponible</div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="text-3xl md:text-4xl font-bold tabular-nums">{formatCurrency(max, currency)}</div>
                  <Dialog open={editTopeOpen} onOpenChange={setEditTopeOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-[12px] gap-1.5 bg-white/15 hover:bg-white/25 text-primary-foreground rounded-full px-3">
                        <Pencil className="h-3 w-3" /> Editar tope
                      </Button>
                    </DialogTrigger>
                    <EditTopeDialog onClose={() => setEditTopeOpen(false)} />
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <div className="rounded-2xl glass-strong p-4 text-foreground">
                    <div className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">Monto gastado</div>
                    <div className="text-xl md:text-2xl font-bold tabular-nums mt-1">{formatCurrency(spent, currency)}</div>
                  </div>
                  <div className="rounded-2xl glass-strong p-4 text-foreground">
                    <div className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">Saldo disponible</div>
                    <div className="text-xl md:text-2xl font-bold tabular-nums mt-1 text-gradient-brand">{formatCurrency(remaining, currency)}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-primary-foreground/80">Consumo del presupuesto</span>
                    <span className="tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-white/90 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="h-9 text-[13px] gap-1.5 rounded-full px-4 bg-foreground text-background hover:bg-foreground/90">
              <Link to="/expenses/new"><Plus className="h-4 w-4" /> Nuevo gasto</Link>
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar gasto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-[13px] rounded-full"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="pl-9 h-9 text-[13px] rounded-full w-[180px]"
              />
            </div>
            <div className="ml-auto text-[12px] text-muted-foreground">
              {filtered.length} de {expenses?.length ?? 0}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-10 text-center">
                <p className="text-[13px] text-muted-foreground">No hay gastos para mostrar</p>
              </div>
            ) : (
              filtered.map(e => {
                const cat = e.category_id ? categoryMap.get(e.category_id) : null;
                return (
                  <div key={e.id} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{e.description || "Sin nombre"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {cat?.name ?? "Sin categoría"} · {formatDate(e.expense_date)}
                      </div>
                    </div>
                    <div className="text-[14px] font-bold tabular-nums whitespace-nowrap">{formatCurrency(Number(e.amount), currency)}</div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {e.receipt_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => viewReceipt(e.receipt_url!)} title="Ver comprobante">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDownloadOne(e)} title="Descargar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Link to={`/expenses/${e.id}`} title="Editar"><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => del.mutate(
                                { id: e.id, receipt_url: e.receipt_url },
                                { onSuccess: () => toast.success("Gasto eliminado"), onError: (err) => toast.error(err.message) },
                              )}
                            >Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function EditTopeDialog({ onClose }: { onClose: () => void }) {
  const active = useActiveBudget();
  const update = useUpdateBudget();
  const create = useCreateBudget();
  const [amount, setAmount] = useState(active?.max_amount?.toString() ?? "");
  const [name, setName] = useState(active?.name ?? "Mi presupuesto");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const max = Number(amount);
    if (!Number.isFinite(max) || max < 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    try {
      if (active) {
        await update.mutateAsync({ id: active.id, max_amount: max, name: name.trim() || active.name });
        toast.success("Tope actualizado");
      } else {
        await create.mutateAsync({ name: name.trim() || "Mi presupuesto", max_amount: max, currency: "ARS", is_active: true });
        toast.success("Presupuesto creado");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{active ? "Editar tope" : "Crear presupuesto"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="bname">Nombre</Label>
          <Input id="bname" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bmax">Tope máximo ({active?.currency ?? "ARS"})</Label>
          <Input id="bmax" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={update.isPending || create.isPending}>
            {(update.isPending || create.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function NoBudget() {
  return (
    <div className="border border-dashed border-border rounded-2xl p-8 text-center">
      <p className="text-[14px] font-medium">Aún no tenés un presupuesto activo</p>
      <p className="text-[12px] text-muted-foreground mt-1">Creá uno desde Presupuestos para empezar a controlar tus viáticos.</p>
      <Button asChild className="mt-4 h-8 text-[12px]"><Link to="/budgets">Ir a Presupuestos</Link></Button>
    </div>
  );
}
