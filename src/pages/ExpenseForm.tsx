import { useEffect, useRef, useState } from "react";
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
import { useActiveBudget } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useCreateExpense, useUpdateExpense, useDeleteExpense, useExpense } from "@/hooks/useExpenses";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, X, FileText, ImageIcon, Camera } from "lucide-react";

export default function ExpenseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const active = useActiveBudget();
  const { data: categories } = useCategories();
  const { data: existing, isLoading: loadingExisting } = useExpense(id);
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const del = useDeleteExpense();

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existing) {
      setCategoryId(existing.category_id ?? "none");
      setAmount(String(existing.amount));
      setDate(existing.expense_date);
      // description stores "Name\n\nNotes" or just name
      const parts = (existing.description ?? "").split("\n\n");
      setName(parts[0] ?? "");
      setDescription(parts.slice(1).join("\n\n"));
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
    if (!active && !isEdit) {
      toast.error("Necesitás un presupuesto activo. Creá uno desde Presupuestos.");
      return;
    }
    if (!name.trim() || !Number.isFinite(amt) || amt < 0) {
      toast.error("Completá nombre y monto");
      return;
    }
    setSubmitting(true);
    try {
      let receipt_url: string | null | undefined = undefined;
      const budgetId = existing?.budget_id ?? active!.id;

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

      const fullDesc = description.trim() ? `${name.trim()}\n\n${description.trim()}` : name.trim();

      const payload = {
        budget_id: budgetId,
        category_id: categoryId === "none" ? null : categoryId,
        amount: amt,
        description: fullDesc,
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

  const hasReceipt = (existingReceipt && !removeReceipt) || file;

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

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <form onSubmit={submit} className="max-w-[520px] space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] tracking-wider uppercase">Nombre</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Almuerzo cliente" required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wider uppercase">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-[11px] tracking-wider uppercase">Valor ({active?.currency ?? "ARS"})</Label>
                <Input id="amount" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[11px] tracking-wider uppercase">Fecha</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-[11px] tracking-wider uppercase">Descripción (opcional)</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wider uppercase">Recibo / Factura</Label>
              {hasReceipt ? (
                <div className="flex items-center justify-between border border-border rounded-md p-2.5 bg-muted/30">
                  {file ? (
                    <div className="flex items-center gap-2 text-[13px] min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  ) : (
                    <a href={signedUrl ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] hover:underline min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Ver comprobante actual</span>
                    </a>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => { setFile(null); if (existingReceipt) setRemoveReceipt(true); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => galleryRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" /> Galería / PDF
                  </Button>
                  <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => cameraRef.current?.click()}>
                    <Camera className="h-4 w-4" /> Cámara
                  </Button>
                  <input ref={galleryRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setRemoveReceipt(false); }} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setRemoveReceipt(false); }} />
                </div>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11 bg-[hsl(95_22%_28%)] hover:bg-[hsl(95_22%_24%)] text-white font-semibold">
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Agregar gasto"}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
