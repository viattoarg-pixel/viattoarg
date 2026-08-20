import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth, normalizePin } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import viattoLogo from "@/assets/viatto-logo-official.png.asset.json";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pin, setPin] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePin(pin);
    if (normalized.length !== 4) {
      toast({
        title: "PIN incompleto",
        description: "Ingresá un PIN de 4 dígitos.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(normalized, fullName.trim());
        toast({ title: "Cuenta creada", description: "Guardá tu PIN, con eso ingresás." });
      } else {
        await signIn(normalized);
      }
    } catch (error: any) {
      const msg: string = error?.message ?? "Intentá de nuevo";
      toast({
        title: mode === "signup" ? "No se pudo crear la cuenta" : "No se pudo iniciar sesión",
        description: /invalid login credentials/i.test(msg)
          ? "Ese PIN no existe. Creá una cuenta nueva."
          : /already registered|already exists|user_already/i.test(msg)
          ? "Ese PIN ya está en uso. Probá con otro."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[420px] border border-border rounded-md p-8 space-y-6">
        <div className="flex flex-col items-start gap-3">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img src={viattoLogo.url} alt="viatto" className="h-12 w-auto" />
          </Link>
          <p className="text-[13px] text-muted-foreground">Controlá tus viáticos en un solo lugar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[13px]">Nombre y apellido</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                maxLength={100}
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-[13px]">Usuario</Label>
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: juanperez"
              maxLength={40}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px]">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 text-[14px] font-medium bg-foreground text-background hover:bg-foreground/90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === "signup" ? "Crear cuenta" : "Ingresar"}
          </Button>
        </form>

        <p className="text-[13px] text-muted-foreground text-center">
          {mode === "signin" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-foreground font-medium underline underline-offset-2"
          >
            {mode === "signin" ? "Registrate" : "Ingresá"}
          </button>
        </p>

        <p className="text-left text-[11px] text-muted-foreground pt-2">
          © {new Date().getFullYear()} viatto
        </p>
      </div>
    </div>
  );
}
