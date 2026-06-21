import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun, Wallet, Receipt, BarChart3, Paperclip, Shield, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { StackedLogo } from "@/components/StackedLogo";

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const features = [
    { icon: Wallet, title: "Definí un tope", desc: "Establecé el monto máximo de viáticos por viaje, equipo o período." },
    { icon: Receipt, title: "Registrá cada gasto", desc: "Comida, transporte, alojamiento y más con categorías inteligentes." },
    { icon: Paperclip, title: "Adjuntá comprobantes", desc: "Subí fotos o PDFs de facturas y tickets desde tu teléfono." },
    { icon: BarChart3, title: "Visualizá el consumo", desc: "Saldo, porcentaje usado y desglose por categoría en tiempo real." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-hero" />
      <div className="pointer-events-none fixed -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />

      <nav className="sticky top-0 z-50 w-full">
        <div className="mx-auto mt-3 max-w-[1180px] px-4">
          <div className="glass-strong rounded-full flex h-[64px] items-center justify-between pl-5 pr-2 shadow-soft">
            <Link to="/" className="flex items-center gap-2.5">
              <StackedLogo size={36} />
              <span className="text-[24px] font-bold lowercase tracking-tight text-foreground leading-none">{"\n"}</span>
            </Link>
            <div className="hidden md:flex items-center gap-7 text-[13px] text-foreground/70">
              <a href="#features" className="hover:text-foreground transition-colors">Funciones</a>
              <a href="#why" className="hover:text-foreground transition-colors">Por qué viatto</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Planes</a>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-brand text-primary-foreground text-[13px] font-medium hover:opacity-95 transition-all shadow-glow"
              >
                Empezar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-24">
        <div className="mx-auto max-w-[960px] text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass text-[12px] text-foreground/75">
            <Leaf className="h-3 w-3 text-primary" />
            Gestión de viáticos consciente y sostenible
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.02]">
            Controlá tus viáticos<br />
            <span className="text-gradient-brand">con claridad y calma.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-muted-foreground max-w-[640px] mx-auto leading-relaxed">
            Reemplazá las planillas y los comprobantes sueltos. Definí un tope, registrá cada gasto
            y mirá en tiempo real cuánto te queda disponible.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-brand text-primary-foreground text-[14px] font-medium hover:opacity-95 transition-all shadow-glow"
            >
              Crear cuenta gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center h-11 px-6 rounded-full glass text-[14px] font-medium hover:bg-card transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>

          {/* Floating preview card */}
          <div className="relative pt-12">
            <div className="absolute inset-x-10 top-16 bottom-4 bg-gradient-brand opacity-20 blur-3xl rounded-full" />
            <div className="relative mx-auto max-w-[820px] glass-strong rounded-[28px] p-3 shadow-float">
              <div className="rounded-[20px] bg-card border border-border/60 p-6 text-left">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[11px] tracking-widest uppercase text-muted-foreground">Presupuesto</div>
                    <div className="text-[22px] font-semibold tabular-nums mt-0.5">$ 1.200.000,00</div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground shadow-glow">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-brand" style={{ width: "62%" }} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { l: "Gastado", v: "$ 744.000", c: "text-primary" },
                    { l: "Disponible", v: "$ 456.000", c: "text-secondary" },
                    { l: "Gastos", v: "28", c: "text-foreground" },
                  ].map(s => (
                    <div key={s.l} className="rounded-2xl bg-muted/40 border border-border/60 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                      <div className={`text-[15px] font-semibold tabular-nums mt-0.5 ${s.c}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 pb-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-center max-w-[640px] mx-auto mb-12">
            <div className="text-[12px] uppercase tracking-widest text-primary font-medium">Funciones</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Todo lo que necesitás, nada que sobre.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 space-y-3 hover:shadow-float hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-11 w-11 rounded-2xl bg-gradient-brand text-primary-foreground flex items-center justify-center shadow-glow">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-semibold">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="relative px-6 pb-28">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="text-[12px] uppercase tracking-widest text-secondary font-medium">Por qué viatto</div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Naturalmente <span className="text-gradient-brand">organizado.</span>
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Inspirado por la calma de la naturaleza y la precisión del software moderno.
              viatto centraliza el tope, cada gasto, las categorías y los comprobantes —
              y te muestra el saldo en tiempo real para que nunca te quedes corto.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Shield, t: "Datos seguros", d: "Cifrado en reposo y en tránsito, accesos controlados." },
                { icon: Sparkles, t: "Experiencia premium", d: "Interfaz fluida, microinteracciones y oscuro nativo." },
              ].map(i => (
                <li key={i.t} className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-soft border border-border flex items-center justify-center shrink-0">
                    <i.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">{i.t}</div>
                    <div className="text-[13px] text-muted-foreground">{i.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-gradient-brand opacity-20 blur-3xl rounded-full" />
            <div className="relative glass-strong rounded-3xl p-8 shadow-float">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <StackedLogo size={28} />
                  <span className="font-bold lowercase text-[18px] leading-none">{"\n"}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Junio 2026</span>
              </div>
              <div className="space-y-3">
                {[
                  { t: "Almuerzo cliente", c: "Comida", v: "$ 18.500" },
                  { t: "Taxi al aeropuerto", c: "Transporte", v: "$ 12.300" },
                  { t: "Hotel Centro 2 noches", c: "Alojamiento", v: "$ 184.000" },
                  { t: "Combustible ruta 9", c: "Combustible", v: "$ 42.700" },
                ].map(r => (
                  <div key={r.t} className="flex items-center justify-between rounded-xl bg-card/60 border border-border/60 px-4 py-3">
                    <div>
                      <div className="text-[13px] font-medium">{r.t}</div>
                      <div className="text-[11px] text-muted-foreground">{r.c}</div>
                    </div>
                    <div className="text-[13px] font-semibold tabular-nums">{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="relative px-6 pb-28">
        <div className="mx-auto max-w-[900px] glass-strong rounded-3xl p-10 md:p-14 text-center shadow-float relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-soft pointer-events-none" />
          <div className="relative space-y-5">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Empezá hoy.<br />Sin tarjeta, sin fricción.
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[520px] mx-auto">
              Creá tu cuenta gratis y cargá tu primer presupuesto en menos de un minuto.
            </p>
            <div className="pt-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 h-12 px-7 rounded-full bg-gradient-brand text-primary-foreground text-[15px] font-medium hover:opacity-95 transition-all shadow-glow"
              >
                Crear cuenta gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border/60 py-8 px-6">
        <div className="mx-auto max-w-[1180px] flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <StackedLogo size={16} />
            <span>.</span>
          </div>
          <Link to="/auth" className="hover:text-foreground">Ingresar</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
