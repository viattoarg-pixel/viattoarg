import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import viattoLogo from "@/assets/viatto-logo-official.png.asset.json";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    if (!email.trim() || password.length < 6) {
      toast({
        title: "Datos incompletos",
        description: "Ingresá un correo válido y una contraseña de al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, fullName.trim());
        toast({ title: "Cuenta creada", description: "Ya podés empezar a usar viatto." });
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error: any) {
      const msg: string = error?.message ?? "Intentá de nuevo";
      toast({
        title: mode === "signup" ? "No se pudo crear la cuenta" : "No se pudo iniciar sesión",
        description: /invalid login credentials/i.test(msg)
          ? "Correo o contraseña incorrectos."
          : /already registered/i.test(msg)
          ? "Ese correo ya tiene una cuenta. Iniciá sesión."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) toast({ title: "Falló el inicio con Google", description: error.message, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Falló el inicio con Google", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
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
            <Label htmlFor="email" className="text-[13px]">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              maxLength={255}
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full h-11 gap-2 text-[14px] font-medium"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continuar con Google
        </Button>

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
