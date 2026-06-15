import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, type Category } from "@/hooks/useCategories";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const PRESET_COLORS = [
  "hsl(25 95% 53%)", "hsl(217 91% 60%)", "hsl(280 80% 60%)", "hsl(0 84% 60%)",
  "hsl(160 60% 45%)", "hsl(48 96% 53%)", "hsl(330 81% 60%)", "hsl(199 89% 48%)",
];

export default function Categories() {
  const { data, isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const del = useDeleteCategory();

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Categorías</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Nueva categoría
              </Button>
            </DialogTrigger>
            <CategoryDialog editing={editing} onClose={() => { setOpen(false); setEditing(null); }} />
          </Dialog>
        </div>

        <div className="p-4 md:p-6 max-w-[700px] w-full">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
              {(data ?? []).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                    <span className="text-[13px] font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true); }}>
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
                          <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                          <AlertDialogDescription>Los gastos asociados quedarán sin categoría.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(c.id, {
                            onSuccess: () => toast.success("Categoría eliminada"),
                            onError: e => toast.error(e.message),
                          })}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {(data?.length ?? 0) === 0 && (
                <div className="p-8 text-center text-[13px] text-muted-foreground">No hay categorías todavía.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CategoryDialog({ editing, onClose }: { editing: Category | null; onClose: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(editing?.color ?? PRESET_COLORS[0]);
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Ingresá un nombre"); return; }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: name.trim(), color });
        toast.success("Categoría actualizada");
      } else {
        await create.mutateAsync({ name: name.trim(), color, icon: "Tag" });
        toast.success("Categoría creada");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cname">Nombre</Label>
          <Input id="cname" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {editing ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
