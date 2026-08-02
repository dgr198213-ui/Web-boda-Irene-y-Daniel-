import { createClient } from "jsr:@supabase/supabase-js@2";

const ORIGEN_PERMITIDO = Deno.env.get("ALLOWED_ORIGIN") ?? "*"; // p.ej. https://ireneydaniel.vercel.app
const cors = {
  "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

async function hash(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v + Deno.env.get("IP_SALT")));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// Aviso por correo (Brevo) — desactivado hasta que se configuren las claves.
// Cuando BREVO_API_KEY esté disponible como secreto, esta función pasa a
// llamarse desde el flujo principal tras el insert, sin bloquear la respuesta.
async function avisarPorCorreo(datos: {
  nombre: string; preboda: boolean; boda: boolean; comida: boolean;
  menu: string; alergias: string; comentarios: string;
}) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return; // integración pendiente de credenciales
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Web de la boda", email: Deno.env.get("BREVO_SENDER")! },
        to: [{ email: Deno.env.get("AVISO_EMAIL")! }],
        subject: `Nueva confirmación: ${datos.nombre}`,
        textContent:
          `${datos.nombre}\n` +
          `Preboda: ${datos.preboda ? "sí" : "no"} · Boda: ${datos.boda ? "sí" : "no"} · Comida: ${datos.comida ? "sí" : "no"}\n` +
          `Menú: ${datos.menu}\n` +
          `Alergias: ${datos.alergias || "—"}\n` +
          `Comentarios: ${datos.comentarios || "—"}`,
      }),
    });
  } catch (e) {
    console.error("brevo", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  // Honeypot: si viene relleno, es un bot. Devolvemos éxito falso.
  if (typeof body.website === "string" && body.website.length > 0) return json({ ok: true });

  const nombre = String(body.nombre ?? "").trim();
  const menu = String(body.menu ?? "");
  if (nombre.length < 2 || nombre.length > 120) return json({ error: "nombre_invalido" }, 400);
  if (!["carne", "pescado"].includes(menu)) return json({ error: "menu_invalido" }, 400);
  if (body.consentimiento !== true) return json({ error: "consentimiento_requerido" }, 400);

  const alergias = String(body.alergias ?? "").trim().slice(0, 500);
  const comentarios = String(body.comentarios ?? "").trim().slice(0, 1000);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const ip_hash = await hash(ip);

  // Rate limit: máximo 5 envíos por IP y hora.
  const hace1h = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from("rsvp")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash).gte("created_at", hace1h);
  if ((count ?? 0) >= 5) return json({ error: "demasiados_envios" }, 429);

  const { error } = await supabase.from("rsvp").insert({
    nombre,
    preboda: body.preboda === true,
    boda: body.boda === true,
    comida: body.comida === true,
    menu,
    alergias: alergias || null,
    comentarios: comentarios || null,
    consentimiento: true,
    ip_hash,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  });
  if (error) { console.error(error); return json({ error: "db_error" }, 500); }

  await avisarPorCorreo({ nombre, preboda: body.preboda === true, boda: body.boda === true, comida: body.comida === true, menu, alergias, comentarios });

  return json({ ok: true });
});
