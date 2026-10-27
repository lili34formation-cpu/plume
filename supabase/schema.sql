-- ════════════════════════════════════════
--  Plume — base de données Supabase (hébergée dans le projet de LinguaPop : ygebxzosjxzagumhkkek)
--  Un compte = un adulte (parent, enseignant(e), orthophoniste). Les enfants sont des profils
--  dans le compte du parent, sans e-mail ni identifiant à eux.
--  Un parent peut partager UN enfant avec un professionnel grâce à un code :
--  le professionnel voit alors le bilan de cet enfant, peut ajouter des notes et adapter le programme.
-- ════════════════════════════════════════

-- 1) Une ligne par compte : tous les profils d'enfants, leur progression et les réglages, en JSON
create table if not exists public.plume_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.plume_data enable row level security;
drop policy if exists "plume lire ses données" on public.plume_data;
create policy "plume lire ses données" on public.plume_data for select using ((select auth.uid()) = user_id);
drop policy if exists "plume créer ses données" on public.plume_data;
create policy "plume créer ses données" on public.plume_data for insert with check ((select auth.uid()) = user_id);
drop policy if exists "plume modifier ses données" on public.plume_data;
create policy "plume modifier ses données" on public.plume_data for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "plume effacer ses données" on public.plume_data;
create policy "plume effacer ses données" on public.plume_data for delete using ((select auth.uid()) = user_id);

-- 2) Codes de partage créés par le parent (un code = un enfant)
create table if not exists public.plume_shares (
  code       text primary key check (char_length(code) between 6 and 12),
  owner      uuid not null references auth.users (id) on delete cascade,
  profile_id text not null,
  created_at timestamptz not null default now()
);
alter table public.plume_shares enable row level security;
drop policy if exists "plume codes du parent" on public.plume_shares;
create policy "plume codes du parent" on public.plume_shares for all using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

-- 3) Accès accordés : tel professionnel (viewer) peut suivre tel enfant de tel parent (owner)
create table if not exists public.plume_links (
  viewer      uuid not null references auth.users (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  profile_id  text not null,
  viewer_name text,
  viewer_role text,
  created_at  timestamptz not null default now(),
  primary key (viewer, owner, profile_id)
);
alter table public.plume_links enable row level security;
-- le parent et le professionnel voient leurs liens ; chacun des deux peut retirer l'accès
drop policy if exists "plume voir ses liens" on public.plume_links;
create policy "plume voir ses liens" on public.plume_links for select using ((select auth.uid()) = owner or (select auth.uid()) = viewer);
drop policy if exists "plume retirer un lien" on public.plume_links;
create policy "plume retirer un lien" on public.plume_links for delete using ((select auth.uid()) = owner or (select auth.uid()) = viewer);
-- (pas de policy insert : les liens ne se créent que par plume_redeem, avec un code valide)

-- Le professionnel saisit un code → accès à l'enfant correspondant
create or replace function public.plume_redeem(p_code text)
returns json language plpgsql security definer set search_path = public, auth as $$
declare s public.plume_shares; u auth.users;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  select * into s from public.plume_shares where code = upper(trim(p_code));
  if not found then raise exception 'code inconnu'; end if;
  if s.owner = auth.uid() then raise exception 'code de votre propre compte'; end if;
  select * into u from auth.users where id = auth.uid();
  insert into public.plume_links (viewer, owner, profile_id, viewer_name, viewer_role)
  values (auth.uid(), s.owner, s.profile_id,
          coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), u.raw_user_meta_data->>'role')
  on conflict (viewer, owner, profile_id) do nothing;
  return json_build_object('owner', s.owner, 'profile_id', s.profile_id);
end $$;

-- Le professionnel récupère les enfants qu'on lui a partagés (le profil seul, pas le reste du compte)
create or replace function public.plume_shared()
returns table (owner uuid, profile_id text, profile jsonb, owner_name text, updated_at timestamptz)
language sql security definer set search_path = public, auth as $$
  select l.owner, l.profile_id,
         (select pr from jsonb_array_elements(d.data->'profiles') pr where pr->>'id' = l.profile_id limit 1),
         coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), d.updated_at
  from public.plume_links l
  join public.plume_data d on d.user_id = l.owner
  join auth.users u on u.id = l.owner
  where l.viewer = auth.uid();
$$;

-- Modifier l'enfant partagé (notes, programme) : seulement si l'accès existe
create or replace function public.plume_patch_shared(p_owner uuid, p_profile_id text, p_kind text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare d jsonb; i int; prof jsonb;
begin
  if not exists (select 1 from public.plume_links where viewer = auth.uid() and owner = p_owner and profile_id = p_profile_id) then
    raise exception 'accès refusé';
  end if;
  select data into d from public.plume_data where user_id = p_owner for update;
  select (ord - 1)::int into i from jsonb_array_elements(d->'profiles') with ordinality as t(pr, ord) where pr->>'id' = p_profile_id;
  if i is null then raise exception 'enfant introuvable'; end if;
  prof := d->'profiles'->i;
  if p_kind = 'note' then
    prof := jsonb_set(prof, '{notes}', coalesce(prof->'notes', '[]'::jsonb) || jsonb_build_array(p_value));
  elsif p_kind = 'prog' then
    prof := jsonb_set(prof, '{prog}', p_value);
  else
    raise exception 'modification inconnue';
  end if;
  prof := jsonb_set(prof, '{t}', to_jsonb((extract(epoch from now()) * 1000)::bigint));
  update public.plume_data set data = jsonb_set(d, array['profiles', i::text], prof), updated_at = now() where user_id = p_owner;
end $$;

revoke all on function public.plume_redeem(text) from public, anon;
revoke all on function public.plume_shared() from public, anon;
revoke all on function public.plume_patch_shared(uuid, text, text, jsonb) from public, anon;
grant execute on function public.plume_redeem(text) to authenticated;
grant execute on function public.plume_shared() to authenticated;
grant execute on function public.plume_patch_shared(uuid, text, text, jsonb) to authenticated;
-- Le compte (auth.users) est commun avec LinguaPop : dans Plume, on propose seulement d'effacer les données Plume
-- (plume_data, plume_shares, plume_links), pas le compte entier.
