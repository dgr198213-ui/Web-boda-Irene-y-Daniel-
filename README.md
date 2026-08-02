# Web de la boda — Irene & Daniel

Sitio de una sola página para la boda de Irene y Daniel, 4 de septiembre de 2027, en la Finca Aldea Tejera Negra (Campillo de Ranas, Guadalajara).

## Qué es esto

`index.html` **no es HTML estático normal**: es una exportación de un artifact de Claude (formato `dc`). El contenido vive dentro de `<x-dc>` como una plantilla con directivas `sc-for` / `sc-if` y bindings `{{ }}`; la lógica de la página está en el `<script type="text/x-dc" data-dc-script>` de más abajo, como una clase `Component extends DCLogic`.

`support.js` es el runtime que parsea esa plantilla y la renderiza en el navegador (carga React/ReactDOM). **No lo edites a mano** — está generado.

## Servir en local

No requiere build. Basta un servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8000
```

Abre `http://localhost:3000` (o el puerto que indique).

## RSVP

Las confirmaciones de asistencia se guardan en una tabla `rsvp` de Supabase — proyecto `irene-daniel-boda` (ref `mifjzlmvfuhrxipnfwqu`), región `eu-central-1` (Frankfurt) — hay datos de salud por las alergias. El formulario del sitio llama a la Edge Function `rsvp` (ya desplegada, `https://mifjzlmvfuhrxipnfwqu.supabase.co/functions/v1/rsvp`, referenciada como `RSVP_ENDPOINT` en `index.html`), que valida, aplica un honeypot y un límite de 5 envíos por IP y hora, y guarda la fila; nunca expone la `service_role key` al navegador. La tabla tiene RLS activado sin políticas: solo la Edge Function (con `service_role`) y tú desde el panel de Supabase podéis leerla.

El aviso automático por correo (Brevo) está en el código pero **desactivado** — sin `BREVO_API_KEY` configurada, la función simplemente no lo intenta.

Ver `supabase/migrations/0001_create_rsvp_table.sql` para el esquema y `supabase/functions/rsvp/index.ts` para la función (ambos ya aplicados/desplegados; estos archivos son la referencia versionada).

### Pendiente de configurar a mano

El MCP de Supabase no expone gestión de secretos de Edge Functions, así que esto requiere la CLI (`npm i -g supabase`, `supabase login`, `supabase link --project-ref mifjzlmvfuhrxipnfwqu`) o el panel web (Project Settings → Edge Functions → Secrets):

```bash
supabase secrets set IP_SALT="$(openssl rand -hex 16)" ALLOWED_ORIGIN="https://TU-DOMINIO-VERCEL"
# Cuando tengas cuenta de Brevo, además:
supabase secrets set BREVO_API_KEY=... BREVO_SENDER=... AVISO_EMAIL=...
```

Sin `IP_SALT`, el hash de IP para el rate-limit sigue funcionando pero con una sal predecible — no es grave (no se guarda la IP en claro), pero conviene fijarlo antes de compartir el enlace ampliamente.

## Despliegue

Pensado para **Vercel** (plan Hobby, gratuito). Ver `vercel.json` para las cabeceras de seguridad y caché.

Antes de desplegar en producción, sustituir:
- `TU-DOMINIO` en las etiquetas `og:image` / `og:url` de `index.html` (deben ser URLs absolutas). Por ahora apuntan al subdominio `*.vercel.app` que asigne el despliegue.
- El secreto `ALLOWED_ORIGIN` de la Edge Function (ver arriba) con ese mismo dominio.

## Tareas de calendario

- **Borrar la tabla `rsvp` de Supabase después del evento** (antes del 31/12/2027, según lo indicado en `privacidad.html`).
