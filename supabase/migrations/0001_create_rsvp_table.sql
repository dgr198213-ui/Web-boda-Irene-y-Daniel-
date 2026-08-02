create extension if not exists pgcrypto;

create table public.rsvp (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (char_length(trim(nombre)) between 2 and 120),
  preboda        boolean not null default false,
  boda           boolean not null default false,
  comida         boolean not null default false,
  menu           text not null check (menu in ('carne','pescado')),
  alergias       text check (char_length(alergias) <= 500),
  comentarios    text check (char_length(comentarios) <= 1000),
  consentimiento boolean not null,
  ip_hash        text,
  user_agent     text,
  created_at     timestamptz not null default now(),
  constraint alergias_requieren_consentimiento
    check (alergias is null or char_length(trim(alergias)) = 0 or consentimiento = true)
);

alter table public.rsvp enable row level security;
-- Sin políticas: `anon` y `authenticated` no pueden hacer nada.
-- Solo acceden la Edge Function (service_role) y tú desde el panel de Supabase.

create index rsvp_created_at_idx on public.rsvp (created_at desc);
create index rsvp_ip_hash_idx    on public.rsvp (ip_hash, created_at desc);
