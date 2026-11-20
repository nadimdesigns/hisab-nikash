import { createClient } from "npm:@supabase/supabase-js@2";

// Phone + PIN signup for Hisab Nikash.
//
// Accounts are stored as <digits>@hisabnikash.com with password "H1<pin>" (the
// same mapping the client uses to sign in). No mail is ever sent: the user is
// created already-confirmed through the admin API, so nothing depends on the
// project's "Confirm email" setting and no auth.users trigger is needed.
// Only this app's synthetic addresses can be created here.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { phone?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const pin = String(body.pin ?? "");
  if (!/^01[3-9]\d{8}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
  if (!/^\d{4}$/.test(pin)) return json({ error: "invalid_pin" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error } = await admin.auth.admin.createUser({
    email: `${phone}@hisabnikash.com`,
    password: `H1${pin}`,
    email_confirm: true,
  });

  if (error) {
    const exists = /already|registered|exists/i.test(error.message) ||
      (error as { code?: string }).code === "email_exists";
    if (exists) return json({ error: "already_registered" }, 409);
    console.error("createUser failed", error.message);
    return json({ error: "signup_failed" }, 500);
  }
  return json({ ok: true });
});
