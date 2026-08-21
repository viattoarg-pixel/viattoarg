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

// Derives the internal Supabase password from the PIN using a server-only
// secret. Without the pepper the password cannot be reconstructed from the PIN,
// so credentials are never guessable from the client.
async function derivePassword(pin: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PEPPER),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`viatto:pin:${pin}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `vp_${hex}`;
}

const pinToEmail = (pin: string) => `pin-${pin}@viatto.app`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const rawPin = typeof body?.pin === "string" ? body.pin : "";
    const pin = rawPin.replace(/\D/g, "");
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";

    if (pin.length !== PIN_LENGTH) return json({ error: "invalid_pin" }, 400);
    if (action !== "signin" && action !== "signup") return json({ error: "invalid_action" }, 400);

    const email = pinToEmail(pin);
    const password = await derivePassword(pin);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const publicClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "signup") {
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username: pin },
      });

      if (createError) {
        const msg = createError.message?.toLowerCase() ?? "";
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          return json({ error: "pin_taken" }, 409);
        }
        console.error("pin-auth signup failed", createError.message);
        return json({ error: "signup_failed" }, 400);
      }
    }

    const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      if (action === "signin") return json({ error: "invalid_credentials" }, 401);
      console.error("pin-auth signin after signup failed", error?.message);
      return json({ error: "signup_failed" }, 400);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (e) {
    console.error("pin-auth unexpected error", e instanceof Error ? e.message : e);
    return json({ error: "unexpected_error" }, 500);
  }
});
