import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { BudgetProgress } from "@/components/BudgetProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, useSetActiveBudget, type Budget } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, Loader2 } from "lucide-react";

const CURRENCIES = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "MXN"];

export default function Budgets() {
  const { data: budgets, isLoading } = useBudgets();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Presupuestos</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Nuevo presupuesto
              </Button>
            </DialogTrigger>
            <BudgetDialog editing={editing} onClose={() => { setOpen(false); setEditing(null); }} />
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3 max-w-[1000px]">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (budgets?.length ?? 0) === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center">
              <p className="text-[14px] font-medium">No hay presupuestos todavía</p>
              <p className="text-[12px] text-muted-foreground mt-1">Creá tu primer presupuesto para comenzar a controlar tus viáticos.</p>
            </div>
          ) : (
            budgets!.map(b => (
              <BudgetRow key={b.id} budget={b} onEdit={() => { setEditing(b); setOpen(true); }} />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function BudgetRow({ budget, onEdit }: { budget: Budget; onEdit: () => void }) {
  const { data: expenses } = useExpenses(budget.id);
  const setActive = useSetActiveBudget();
  const del = useDeleteBudget();
  const spent = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="border border-border rounded-md p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-medium">{budget.name}</h3>
            {budget.is_active && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-medium border border-success/30">
                <Check className="h-2.5 w-2.5" /> Activo
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Tope: {formatCurrency(Number(budget.max_amount), budget.currency)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!budget.is_active && (
            <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setActive.mutate(budget.id)}>
              Activar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán también todos los gastos asociados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => del.mutate(budget.id, {
                    onSuccess: () => toast.success("Presupuesto eliminado"),
                    onError: (e) => toast.error(e.message),
                  })}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BudgetProgress max={Number(budget.max_amount)} spent={spent} currency={budget.currency} />
    </div>
  );
}

function BudgetDialog({ editing, onClose }: { editing: Budget | null; onClose: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [amount, setAmount] = useState(editing?.max_amount?.toString() ?? "");
  const [currency, setCurrency] = useState(editing?.currency ?? "ARS");
  const create = useCreateBudget();
  const update = useUpdateBudget();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const max = Number(amount);
    if (!name.trim() || !Number.isFinite(max) || max < 0) {
      toast.error("Completá los campos correctamente");
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: name.trim(), max_amount: max, currency });
        toast.success("Presupuesto actualizado");
      } else {
        await create.mutateAsync({ name: name.trim(), max_amount: max, currency, is_active: true });
        toast.success("Presupuesto creado");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del ente o empresa" required />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Tope máximo</Label>
            <Input id="amount" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {editing ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
