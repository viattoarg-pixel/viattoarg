import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun, Wallet, Receipt, BarChart3, Paperclip } from "lucide-react";
import { useTheme } from "next-themes";
import { StackedLogo } from "@/components/StackedLogo";

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const features = [
    { icon: Wallet, title: "Definí un tope", desc: "Establecé el monto máximo de viáticos por viaje o período." },
    { icon: Receipt, title: "Registrá cada gasto", desc: "Cargá comida, transporte, alojamiento y más con categorías personalizadas." },
    { icon: Paperclip, title: "Adjuntá comprobantes", desc: "Subí fotos o PDFs de facturas y tickets directamente desde tu teléfono." },
    { icon: BarChart3, title: "Visualizá el consumo", desc: "Saldo disponible, porcentaje usado y desglose por categoría en tiempo real." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <StackedLogo size={16} />
            <span className="text-[14px] font-bold tracking-[0.08em] uppercase">Viáticos</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground"
              aria-label="Cambiar tema"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Empezar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-[900px] text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/30 text-[12px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Gestión de viáticos empresariales
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Controlá tus viáticos<br />sin perder un solo peso.
          </h1>
          <p className="text-[15px] md:text-[17px] text-muted-foreground max-w-[640px] mx-auto leading-relaxed">
            Reemplazá las planillas y los comprobantes sueltos. Definí un tope, registrá cada gasto
            y mirá en tiempo real cuánto te queda disponible.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              Crear cuenta gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center h-10 px-5 rounded-md border border-border text-[14px] font-medium hover:bg-muted/50 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {features.map(f => (
            <div key={f.title} className="bg-background p-6 space-y-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="text-[14px] font-medium">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[900px] border border-border rounded-lg p-8 md:p-12 bg-card space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">¿Por qué dejar las planillas?</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Muchas empresas controlan los viáticos con hojas de cálculo, mensajes y comprobantes físicos.
            Es frágil, se pierde información y el riesgo de pasarte del presupuesto es alto.
          </p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Viáticos</span> centraliza todo: el tope,
            cada gasto, las categorías y los comprobantes adjuntos. Y te muestra el saldo en tiempo real
            para que nunca te quedes corto.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-6 px-6">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <StackedLogo size={14} />
            <span>Viáticos © {new Date().getFullYear()}</span>
          </div>
          <Link to="/auth" className="hover:text-foreground">Ingresar</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
