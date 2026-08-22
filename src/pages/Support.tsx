import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, Mail, HeartHandshake, Loader2, Send } from "lucide-react";
import { z } from "zod";

const CONTACT_EMAIL = "viattoarg@gmail.com";

const DONATION_FIELDS = [
  { label: "CVU", value: "0000076500000021537882" },
  { label: "Alias", value: "ebarrera86.ppay" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre").max(100, "Máximo 100 caracteres"),
  message: z.string().trim().min(1, "Escribí tu mensaje").max(2000, "Máximo 2000 caracteres"),
});

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    toast({ title: `${label} copiado`, description: value });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2.5 bg-background">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[14px] font-medium tabular-nums truncate">{value}</p>
      </div>
      <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

export default function Support() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Consulta de ${name || "un usuario"} — viatto`
  )}&body=${encodeURIComponent(`${message}\n\n— ${name}`)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, message });
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({ title: "Revisá el formulario", description: first.message, variant: "destructive" });
      return;
    }

    setSending(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      message: parsed.data.message,
      user_id: userRes.user?.id ?? null,
    });
    setSending(false);

    if (error) {
      toast({ title: "No se pudo enviar", description: error.message, variant: "destructive" });
      return;
    }

    setSent(true);
    setMessage("");
    toast({ title: "¡Gracias!", description: "Recibimos tu mensaje." });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Contacto y donaciones</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1100px]">
            {/* Comentarios */}
            <section className="border border-border rounded-md p-5 space-y-4 bg-card">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-gradient-brand text-primary-foreground flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-medium">¿Tenés dudas o comentarios?</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Escribinos y te respondemos a la brevedad.
                  </p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[12px]">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    maxLength={100}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-[12px]">Mensaje</Label>
                  <Textarea
                    id="message"
                    value={message}
                    maxLength={2000}
                    rows={6}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Contanos tu duda, sugerencia o comentario…"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={sending} className="gap-1.5">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar mensaje
                  </Button>
                  <Button asChild type="button" variant="outline" className="gap-1.5">
                    <a href={mailtoHref}>Enviar por correo</a>
                  </Button>
                </div>
                {sent && (
                  <p className="text-[12px] text-muted-foreground">
                    Mensaje recibido. También podés escribirnos directo a{" "}
                    <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                  </p>
                )}
              </form>
            </section>

            {/* Donaciones */}
            <section className="border border-border rounded-md p-5 space-y-4 bg-card h-fit">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-gradient-brand text-primary-foreground flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-medium">Donaciones</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Si viatto te resulta útil, podés colaborar con una donación desde tu billetera virtual.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {DONATION_FIELDS.map(f => (
                  <CopyRow key={f.label} label={f.label} value={f.value} />
                ))}
              </div>

              <p className="text-[12px] text-muted-foreground">
                Copiá el CVU o el alias, abrí tu billetera virtual (Mercado Pago, Personal Pay, banco, etc.)
                y enviá el monto que quieras. ¡Gracias por el apoyo!
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
