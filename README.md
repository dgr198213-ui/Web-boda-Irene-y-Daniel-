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

Las confirmaciones de asistencia se guardan en una tabla `rsvp` de Supabase (proyecto en `eu-central-1`, Frankfurt — hay datos de salud por las alergias). El formulario del sitio llama a una Supabase Edge Function (`supabase/functions/rsvp`) que valida, aplica un límite de envíos por IP y guarda la fila; nunca expone la `service_role key` al navegador.

Ver `supabase/schema.sql` para el esquema y `supabase/functions/rsvp/index.ts` para la función.

## Despliegue

Pensado para **Vercel** (plan Hobby, gratuito). Ver `vercel.json` para las cabeceras de seguridad y caché.

Antes de desplegar en producción, sustituir:
- `TU-DOMINIO` en las etiquetas `og:image` / `og:url` de `index.html` (deben ser URLs absolutas).
- `RSVP_ENDPOINT` en `index.html` con la URL real de la Edge Function.
- Los secretos de la Edge Function (`IP_SALT`, `BREVO_API_KEY`, `BREVO_SENDER`, `AVISO_EMAIL`, `ALLOWED_ORIGIN`).

## Tareas de calendario

- **Borrar la tabla `rsvp` de Supabase después del evento** (antes del 31/12/2027, según lo indicado en `privacidad.html`).
