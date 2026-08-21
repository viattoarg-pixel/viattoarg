import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PEPPER = Deno.env.get("PIN_AUTH_PEPPER")!;

const PIN_LENGTH = 6;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
const CODE_LENGTH = 8;

// HMAC con un secreto que sólo vive en el servidor.
async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PEPPER),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// El PIN por sí solo no alcanza: la identidad y la contraseña internas se
// derivan del PIN + un código de cuenta aleatorio de 8 caracteres (~1e12
// combinaciones extra) que nunca se puede adivinar desde el cliente.
const identity = async (pin: string, code: string) => {
  const digest = await hmac(`viatto:id:${pin}:${code}`);
  return `acct-${digest.slice(0, 32)}@viatto.app`;
};
const password = (pin: string, code: string) => hmac(`viatto:pw:${pin}:${code}`).then((h) => `vp_${h}`);

// Credenciales del esquema anterior (sólo PIN) para migrar cuentas existentes.
const legacyEmail = (pin: string) => `pin-${pin}@viatto.app`;
const legacyPassword = (pin: string) => hmac(`viatto:pin:${pin}`).then((h) => `vp_${h}`);

const generateCode = () => {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
};

const normalizeCode = (value: unknown) =>
  typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const pin = (typeof body?.pin === "string" ? body.pin : "").replace(/\D/g, "");
    const code = normalizeCode(body?.accountCode);
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";

    if (pin.length !== PIN_LENGTH) return json({ error: "invalid_pin" }, 400);
    if (action !== "signin" && action !== "signup") return json({ error: "invalid_action" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const publicClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const session = (token: { access_token: string; refresh_token: string }, accountCode?: string) =>
      json({ access_token: token.access_token, refresh_token: token.refresh_token, accountCode });

    if (action === "signup") {
      const accountCode = generateCode();
      const email = await identity(pin, accountCode);
      const pass = await password(pin, accountCode);

      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError) {
        console.error("pin-auth signup failed", createError.message);
        return json({ error: "signup_failed" }, 400);
      }

      const { data, error } = await publicClient.auth.signInWithPassword({ email, password: pass });
      if (error || !data.session) {
        console.error("pin-auth signin after signup failed", error?.message);
        return json({ error: "signup_failed" }, 400);
      }
      return session(data.session, accountCode);
    }

    // signin
    if (code.length === CODE_LENGTH) {
      const email = await identity(pin, code);
      const pass = await password(pin, code);
      const { data, error } = await publicClient.auth.signInWithPassword({ email, password: pass });
      if (error || !data.session) return json({ error: "invalid_credentials" }, 401);
      return session(data.session);
    }

    // Sin código: sólo puede entrar una cuenta del esquema anterior, y en ese
    // caso se migra al esquema nuevo y se le entrega su código de cuenta.
    const oldEmail = legacyEmail(pin);
    const oldPass = await legacyPassword(pin);
    const legacy = await publicClient.auth.signInWithPassword({ email: oldEmail, password: oldPass });
    if (legacy.error || !legacy.data.session) {
      return json({ error: code.length ? "invalid_code" : "code_required" }, 401);
    }

    const accountCode = generateCode();
    const newEmail = await identity(pin, accountCode);
    const newPass = await password(pin, accountCode);
    const { error: updateError } = await admin.auth.admin.updateUserById(legacy.data.user!.id, {
      email: newEmail,
      password: newPass,
      email_confirm: true,
    });
    if (updateError) {
      console.error("pin-auth migration failed", updateError.message);
      return session(legacy.data.session);
    }

    const migrated = await publicClient.auth.signInWithPassword({ email: newEmail, password: newPass });
    if (migrated.error || !migrated.data.session) return json({ error: "invalid_credentials" }, 401);
    return session(migrated.data.session, accountCode);
  } catch (e) {
    console.error("pin-auth unexpected error", e instanceof Error ? e.message : e);
    return json({ error: "unexpected_error" }, 500);
  }
});
