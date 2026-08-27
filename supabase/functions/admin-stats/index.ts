import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData, error: userError } = await anon.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) return json({ error: "forbidden" }, 403);

    // Contar usuarios paginando la lista de auth
    let total = 0;
    let active7d = 0;
    let active30d = 0;
    let newLast7d = 0;
    const now = Date.now();
    const DAY = 86_400_000;

    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const users = data?.users ?? [];
      for (const u of users) {
        total++;
        const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        if (last && now - last <= 7 * DAY) active7d++;
        if (last && now - last <= 30 * DAY) active30d++;
        const created = u.created_at ? new Date(u.created_at).getTime() : 0;
        if (created && now - created <= 7 * DAY) newLast7d++;
      }
      if (users.length < 200) break;
    }

    const [{ count: expenses }, { count: budgets }] = await Promise.all([
      admin.from("expenses").select("id", { count: "exact", head: true }),
      admin.from("budgets").select("id", { count: "exact", head: true }),
    ]);

    return json({ total, active7d, active30d, newLast7d, expenses: expenses ?? 0, budgets: budgets ?? 0 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
