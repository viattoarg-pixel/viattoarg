import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, UserPlus, Receipt, Wallet, CalendarClock } from "lucide-react";

interface Stats {
  total: number;
  active7d: number;
  active30d: number;
  newLast7d: number;
  expenses: number;
  budgets: number;
}

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.functions.invoke("admin-stats");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as Stats;
    },
  });

  const cards = [
    { label: "Usuarios registrados", value: data?.total, icon: Users },
    { label: "Activos (7 días)", value: data?.active7d, icon: Activity },
    { label: "Activos (30 días)", value: data?.active30d, icon: CalendarClock },
    { label: "Nuevos (7 días)", value: data?.newLast7d, icon: UserPlus },
    { label: "Gastos cargados", value: data?.expenses, icon: Receipt },
    { label: "Presupuestos", value: data?.budgets, icon: Wallet },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Métricas generales de uso de viatto.</p>
        </div>

        {roleLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !isAdmin ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tenés permisos para ver esta sección.
            </CardContent>
          </Card>
        ) : (
          <>
            {error && (
              <p className="text-sm text-destructive">No se pudieron cargar las métricas.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => (
                <Card key={c.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {c.label}
                    </CardTitle>
                    <c.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums">
                      {isLoading ? "—" : (c.value ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
