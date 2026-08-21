import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  useAuth,
  normalizePin,
  normalizeCode,
  PIN_LENGTH,
  CODE_LENGTH,
  CodeRequiredError,
  getStoredAccountCode,
} from "@/contexts/AuthContext";
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
  const [accountCode, setAccountCode] = useState("");
  const [needsCode, setNeedsCode] = useState(() => !getStoredAccountCode());
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && !issuedCode) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePin(pin);
    if (normalized.length !== PIN_LENGTH) {
      toast({
        title: "PIN incompleto",
        description: `Ingresá un PIN de ${PIN_LENGTH} dígitos.`,
        variant: "destructive",
      });
      return;
    }
    if (mode === "signin" && needsCode && accountCode.length !== CODE_LENGTH) {
      toast({
        title: "Falta el código de cuenta",
        description: `El código tiene ${CODE_LENGTH} caracteres y se te mostró al crear la cuenta.`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const code = await signUp(normalized, fullName.trim());
        if (code) setIssuedCode(code);
        toast({ title: "Cuenta creada", description: "Guardá tu PIN y tu código de cuenta." });
      } else {
        const code = await signIn(normalized, accountCode || undefined);
        if (code) setIssuedCode(code);
      }
    } catch (error: any) {
      if (error instanceof CodeRequiredError) {
        setNeedsCode(true);
      }
      toast({
        title: mode === "signup" ? "No se pudo crear la cuenta" : "No se pudo iniciar sesión",
        description: error?.message ?? "Intentá de nuevo",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (issuedCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px] border border-border rounded-md p-8 space-y-6">
          <img src={viattoLogo.url} alt="viatto" className="h-12 w-auto" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Tu código de cuenta</h1>
            <p className="text-[13px] text-muted-foreground">
              Anotalo. Junto con tu PIN es lo único que permite entrar desde otro dispositivo. No
              se puede recuperar si lo perdés.
            </p>
          </div>
          <div className="border border-border rounded-md py-5 text-center text-2xl font-semibold tracking-[0.25em]">
            {issuedCode}
          </div>
          <Button
            onClick={() => setIssuedCode(null)}
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
          >
            Ya lo guardé, continuar
          </Button>
        </div>
      </div>
    );
  }

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
            <Label htmlFor="pin" className="text-[13px]">PIN de {PIN_LENGTH} dígitos</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(normalizePin(e.target.value))}
              placeholder="••••••"
              maxLength={PIN_LENGTH}
              className="h-14 text-center text-2xl tracking-[0.5em] font-semibold"
            />
          </div>

          {mode === "signin" && !needsCode && (
            <button
              type="button"
              onClick={() => setNeedsCode(true)}
              className="text-[12px] text-muted-foreground underline underline-offset-2"
            >
              Usar otro código de cuenta
            </button>
          )}

          {mode === "signin" && needsCode && (
            <div className="space-y-2">
              <Label htmlFor="accountCode" className="text-[13px]">
                Código de cuenta ({CODE_LENGTH} caracteres)
              </Label>
              <Input
                id="accountCode"
                value={accountCode}
                onChange={(e) => setAccountCode(normalizeCode(e.target.value))}
                placeholder="Ej: K7M2QP4X"
                maxLength={CODE_LENGTH}
                className="h-11 text-center tracking-[0.25em] font-semibold uppercase"
              />
              <p className="text-[11px] text-muted-foreground">
                Se te mostró al crear la cuenta. Este dispositivo lo recuerda para las próximas veces.
              </p>
            </div>
          )}


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
