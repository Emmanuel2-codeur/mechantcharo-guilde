-- ============================================================================
-- 13 — Durcissement sécurité (suite). Additif, ré-exécutable. Prérequis : 12.
--  1. Emails admin automatiques : sortis du code, stockés en base (table verrouillée)
--  2. Trigger protect_admin_privileges : recréé SEULEMENT s'il n'existe pas déjà
--  3. ff_uid (ID Free Fire) non lisible par les visiteurs non connectés
-- Fais une sauvegarde avant, et teste ensuite : connexion visiteur, membre, admin.
-- ============================================================================

-- 1. Emails admin en base ----------------------------------------------------
create table if not exists public.config_admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.config_admin_emails enable row level security;  -- aucune policy = inaccessible depuis le client
revoke all on public.config_admin_emails from anon, authenticated;

-- Reprend les admins actuels (aucun email n'est écrit dans le dépôt)
insert into public.config_admin_emails (email)
select lower(u.email)
from auth.users u
join public.profiles p on p.id = u.id
where p.role in ('admin', 'super_admin') and u.email is not null
on conflict do nothing;

create or replace function public.is_configured_admin_email(p_email text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.config_admin_emails where email = lower(p_email));
$$;
-- Personne ne doit pouvoir tester depuis l'extérieur si un email est admin
revoke all on function public.is_configured_admin_email(text) from public, anon, authenticated;

-- Pour ajouter / retirer un admin automatique plus tard (dans le SQL Editor) :
--   insert into public.config_admin_emails values ('nouvel.admin@exemple.com');
--   delete from public.config_admin_emails where email = 'ancien.admin@exemple.com';

-- 2. Trigger de protection des privilèges admin (reproductible) ---------------
-- Ta base en a déjà un (protect_admin_privileges) : il n'est alors PAS remplacé.
do $do$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'protect_admin_privileges'
  ) then
    execute $f$
      create function public.protect_admin_privileges()
      returns trigger language plpgsql security definer set search_path = public as $b$
      begin
        if new.role is distinct from old.role
           and (old.role in ('admin', 'super_admin') or new.role in ('admin', 'super_admin'))
           and not public.is_super_admin() then
          raise exception 'Accès refusé : seul le Super Admin peut modifier les privilèges administratifs.';
        end if;
        return new;
      end;
      $b$
    $f$;
    execute 'create trigger trg_protect_admin_privileges before update on public.profiles
             for each row execute function public.protect_admin_privileges()';
  end if;
end
$do$;

-- 3. ff_uid caché aux visiteurs non connectés ---------------------------------
-- Les membres connectés (role authenticated) le voient toujours (classement, admin).
do $do$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name <> 'ff_uid';

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', cols);
end
$do$;
-- ATTENTION : si tu ajoutes plus tard une colonne à profiles que les visiteurs doivent lire,
-- relance ce bloc (ou : grant select (nouvelle_colonne) on public.profiles to anon;).
