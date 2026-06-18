import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setJobTitle(profile.job_title ?? "");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, full_name: name, job_title: jobTitle },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      await refreshProfile();
      toast.success("Perfil actualizado");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Ajustes</h1>
        </div>

        <div className="p-4 md:p-6 max-w-[560px] w-full space-y-6">
          <form onSubmit={save} className="space-y-4 border border-border rounded-md p-4">
            <div>
              <h2 className="text-[14px] font-medium">Perfil</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Tu información personal.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job">Puesto / Empresa</Label>
              <Input id="job" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>

          <div className="border border-border rounded-md p-4 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-medium">Sesión</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Cerrar sesión en este dispositivo.</p>
            </div>
            <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
