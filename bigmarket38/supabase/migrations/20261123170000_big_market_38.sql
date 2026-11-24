-- =====================================================================
-- BIG MARKET 38 : base de données du site et de l'espace admin
-- (projet Supabase « BIG MARKET 38 », déjà appliqué : ce fichier sert
--  d'archive et permet de recréer la base à l'identique si besoin)
--
--  - public.contenu            : un document JSON par rubrique du site
--  - public.contenu_historique : versions précédentes de chaque rubrique
--  - public.admins             : adresses autorisées dans l'espace admin
--  - stockage « photos »       : photos envoyées depuis l'espace admin
--  Lecture publique du contenu ; écriture réservée aux administrateurs.
-- =====================================================================

create schema if not exists prive;
grant usage on schema prive to authenticated, supabase_auth_admin;

-- ---------- Tables ----------
create table public.contenu (
  cle text primary key check (cle ~ '^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)?$'),
  valeur jsonb not null,
  maj_le timestamptz not null default now(),
  maj_par text
);
comment on table public.contenu is 'Contenu du site BIG MARKET 38 : un document JSON par rubrique, modifié depuis l''espace admin. Une rubrique absente = contenu d''origine du site.';

create table public.contenu_historique (
  id bigint generated always as identity primary key,
  cle text not null,
  valeur jsonb not null,
  enregistre_le timestamptz not null,
  enregistre_par text,
  archive_le timestamptz not null default now()
);
create index contenu_historique_cle_idx on public.contenu_historique (cle, id desc);
comment on table public.contenu_historique is 'Versions précédentes du contenu, archivées à chaque enregistrement.';

create table public.admins (
  email text primary key check (email = lower(email)),
  secours_empreinte text,
  creation_avant timestamptz not null default (now() + interval '14 days'),
  ajoute_le timestamptz not null default now()
);
comment on table public.admins is 'Adresses e-mail autorisées dans l''espace admin. Invisible depuis l''API publique.';

insert into public.admins (email) values ('morgancoulet5@icloud.com');

alter table public.contenu enable row level security;
alter table public.contenu_historique enable row level security;
alter table public.admins enable row level security;

-- ---------- Qui est administrateur ? ----------
create or replace function prive.est_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function prive.est_admin() to authenticated;

-- ---------- Règles d'accès au contenu ----------
create policy "contenu_lecture_publique" on public.contenu
  for select to anon, authenticated using (true);
create policy "contenu_ajout_admin" on public.contenu
  for insert to authenticated with check ((select prive.est_admin()));
create policy "contenu_modification_admin" on public.contenu
  for update to authenticated using ((select prive.est_admin())) with check ((select prive.est_admin()));
create policy "contenu_suppression_admin" on public.contenu
  for delete to authenticated using ((select prive.est_admin()));
create policy "historique_lecture_admin" on public.contenu_historique
  for select to authenticated using ((select prive.est_admin()));

-- ---------- Date et auteur de chaque modification ----------
create or replace function prive.horodater_contenu() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.maj_le := now();
  new.maj_par := coalesce(auth.jwt() ->> 'email', current_user);
  return new;
end;
$$;
create trigger contenu_horodatage before insert or update on public.contenu
  for each row execute function prive.horodater_contenu();

-- ---------- Archive de la version précédente ----------
create or replace function prive.archiver_contenu() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.valeur is not distinct from old.valeur then
    return new;
  end if;
  insert into public.contenu_historique (cle, valeur, enregistre_le, enregistre_par)
  values (old.cle, old.valeur, old.maj_le, old.maj_par);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger contenu_archive before update or delete on public.contenu
  for each row execute function prive.archiver_contenu();

-- ---------- Comptes : seules les adresses de public.admins peuvent exister ----------
create or replace function prive.limiter_inscriptions() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.email = lower(coalesce(new.email, ''))) then
    raise exception 'Inscription réservée à l''administrateur du site BIG MARKET 38';
  end if;
  return new;
end;
$$;
create trigger limiter_inscriptions before insert on auth.users
  for each row execute function prive.limiter_inscriptions();

-- ---------- Stockage des photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos_lecture_admin" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and (select prive.est_admin()));
create policy "photos_ajout_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and (select prive.est_admin()));
create policy "photos_modification_admin" on storage.objects
  for update to authenticated using (bucket_id = 'photos' and (select prive.est_admin()))
  with check (bucket_id = 'photos' and (select prive.est_admin()));
create policy "photos_suppression_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and (select prive.est_admin()));
