import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBudgets, useActiveBudget } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useCreateExpense, useUpdateExpense, useDeleteExpense, useExpense } from "@/hooks/useExpenses";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, X, Trash2, FileText } from "lucide-react";

export default function ExpenseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: budgets } = useBudgets();
  const active = useActiveBudget();
  const { data: categories } = useCategories();
  const { data: existing, isLoading: loadingExisting } = useExpense(id);
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const del = useDeleteExpense();

  const [budgetId, setBudgetId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit && active && !budgetId) setBudgetId(active.id);
  }, [active, isEdit, budgetId]);

  useEffect(() => {
    if (existing) {
      setBudgetId(existing.budget_id);
      setCategoryId(existing.category_id ?? "none");
      setAmount(String(existing.amount));
      setDescription(existing.description);
      setDate(existing.expense_date);
      setExistingReceipt(existing.receipt_url ?? null);
    }
  }, [existing]);

  useEffect(() => {
    if (existingReceipt && !removeReceipt) {
      supabase.storage.from("receipts").createSignedUrl(existingReceipt, 600)
        .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
    } else {
      setSignedUrl(null);
    }
  }, [existingReceipt, removeReceipt]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = Number(amount);
    if (!budgetId || !Number.isFinite(amt) || amt < 0) {
      toast.error("Completá los campos requeridos");
      return;
    }
    setSubmitting(true);
    try {
      let receipt_url: string | null | undefined = undefined;

      if (removeReceipt && existingReceipt) {
        await supabase.storage.from("receipts").remove([existingReceipt]);
        receipt_url = null;
      }

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${budgetId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        if (existingReceipt && !removeReceipt) {
          await supabase.storage.from("receipts").remove([existingReceipt]);
        }
        receipt_url = path;
      }

      const payload = {
        budget_id: budgetId,
        category_id: categoryId === "none" ? null : categoryId,
        amount: amt,
        description: description.trim(),
        expense_date: date,
        ...(receipt_url !== undefined ? { receipt_url } : {}),
      };

      if (isEdit) {
        await update.mutateAsync({ id: id!, ...payload });
        toast.success("Gasto actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Gasto registrado");
      }
      navigate("/expenses");
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    try {
      await del.mutateAsync({ id, receipt_url: existing?.receipt_url });
      toast.success("Gasto eliminado");
      navigate("/expenses");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  };

  if (isEdit && loadingExisting) {
    return <AppLayout><div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link to="/expenses"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-[13px] font-medium">{isEdit ? "Editar gasto" : "Nuevo gasto"}</h1>
          </div>
          {isEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[12px] text-muted-foreground hover:text-destructive gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 max-w-[640px] w-full">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
              <div className="space-y-1.5">
                <Label>Presupuesto</Label>
                <Select value={budgetId} onValueChange={setBudgetId}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                  <SelectContent>
                    {(budgets ?? []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Monto</Label>
                <Input id="amount" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Almuerzo con cliente, taxi al aeropuerto..." rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Comprobante</Label>
              {existingReceipt && !removeReceipt && !file && (
                <div className="flex items-center justify-between border border-border rounded-md p-2.5 bg-muted/30">
                  <a href={signedUrl ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] hover:underline min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Ver comprobante actual</span>
                  </a>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => setRemoveReceipt(true)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {file && (
                <div className="flex items-center justify-between border border-border rounded-md p-2.5 bg-muted/30">
                  <div className="flex items-center gap-2 text-[13px] min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => setFile(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {!file && (removeReceipt || !existingReceipt) && (
                <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-4 cursor-pointer hover:bg-muted/30 transition-colors text-[13px] text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>Subir imagen o PDF</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate("/expenses")}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {isEdit ? "Guardar cambios" : "Registrar gasto"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
