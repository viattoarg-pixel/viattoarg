import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;

export function useExpenses(budgetId?: string | null) {
  return useQuery({
    queryKey: ["expenses", budgetId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (budgetId) q = q.eq("budget_id", budgetId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ["expense", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"expenses">, "user_id">) => {
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase.from("expenses").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense", vars.id] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, receipt_url }: { id: string; receipt_url?: string | null }) => {
      if (receipt_url) {
        await supabase.storage.from("receipts").remove([receipt_url]);
      }
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
