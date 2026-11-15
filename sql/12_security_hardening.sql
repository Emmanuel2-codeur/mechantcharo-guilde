-- ============================================================================
-- 12 — Durcissement sécurité + détection d'un email déjà lié à un compte
-- Additif et ré-exécutable. À tester d'abord sur une copie / en préproduction.
-- (Le trigger protect_admin_privileges existe déjà dans ta base : il n'est PAS touché ici.)
-- ============================================================================

-- 1. Email déjà lié à un compte ? Renvoie les méthodes liées (google, email…).
create or replace function public.email_account_status(p_email text)
returns text[]
language sql stable security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(distinct i.provider), '{}'::text[])
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(p_email));
$$;
revoke all on function public.email_account_status(text) from public;
grant execute on function public.email_account_status(text) to anon, authenticated;

-- 2. Un joueur ne peut modifier QUE son pseudo / ff_uid / avatar.
--    (la policy profiles_update_own ne protégeait que role et status :
--     un joueur pouvait donc se mettre des points, victoires, ou changer de poule.)
create or replace function public.protect_profile_stats()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() est null pour l'éditeur SQL / service_role : on laisse passer.
  if auth.uid() is not null and not public.is_admin() then
    if new.role         is distinct from old.role
    or new.status       is distinct from old.status
    or new.group_id     is distinct from old.group_id
    or new.total_points is distinct from old.total_points
    or new.total_damage is distinct from old.total_damage
    or new.wins         is distinct from old.wins
    or new.losses       is distinct from old.losses then
      raise exception 'Accès refusé : ces champs ne sont modifiables que par l''administration.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_stats on public.profiles;
create trigger trg_protect_profile_stats
  before update on public.profiles
  for each row execute function public.protect_profile_stats();
