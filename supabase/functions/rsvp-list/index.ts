import { createClient } from "jsr:@supabase/supabase-js@2";

const ORIGEN_PERMITIDO = Deno.env.get("ALLOWED_ORIGIN")!;
const cors = {
  "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  if (body.password !== Deno.env.get("PANEL_PASSWORD")) {
    // pequeño retraso para dificultar fuerza bruta
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "incorrecto" }, 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase
    .from("rsvp")
    .select("nombre, preboda, boda, comida, menu, alergias, comentarios, created_at")
    .order("created_at", { ascending: false });

  if (error) return json({ error: "db_error" }, 500);
  return json({ ok: true, invitados: data });
});
