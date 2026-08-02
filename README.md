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

Pensado para **Vercel** (plan Hobby, gratuito). `vercel.json` ya trae las cabeceras de seguridad y caché.

El sitio pesa ~5 MB (sobre todo `uploads/`), así que la forma correcta de desplegarlo es la integración estándar de Vercel con Git, no una subida de archivos suelta:

1. En [vercel.com](https://vercel.com) → **Add New… → Project → Import Git Repository** → selecciona `dgr198213-ui/Web-boda-Irene-y-Daniel-` (rama `claude/irene-daniel-design-y1fzvg` o la que sea la rama por defecto). Vercel detecta que es un sitio estático (no hay `package.json`) y no necesita build command ni output directory.
2. Activa **Web Analytics** en el proyecto (Settings → Analytics) — no usa cookies, así que no hace falta banner.
3. Con el dominio ya asignado (el `*.vercel.app` por defecto, o uno propio si lo compras), sustituir:
   - `TU-DOMINIO` en las etiquetas `og:image` / `og:url` de `index.html` (deben ser URLs absolutas).
   - El secreto `ALLOWED_ORIGIN` de la Edge Function (ver arriba) con ese mismo dominio.

## CI

`.github/workflows/check.yml` falla el build si `index.html` referencia algún archivo en `uploads/`, `assets/`, `fonts/` o `vendor/` que no exista en el repo (incluidos los 12 PNG botánicos con nombre dinámico `assets/b2-${nombre}.png`). Esto es justo lo que habría detectado los dos fallos críticos de la auditoría original (assets que faltaban).

## Tareas de calendario

- **Borrar la tabla `rsvp` de Supabase después del evento** (antes del 31/12/2027, según lo indicado en `privacidad.html`).
