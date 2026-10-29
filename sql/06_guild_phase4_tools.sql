-- ============================================================================
-- 06 — PHASE 4 : Import des membres, rappels d'événements, MVP du mois
-- Prérequis : 04 et 05. Additif uniquement. À exécuter en une fois.
-- ============================================================================

-- 1. Importer les joueurs approuvés comme membres de la guilde -----------------
create or replace function public.import_players_as_members()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  insert into public.guild_members (profile_id, pseudo, ff_uid)
  select p.id, p.pseudo, p.ff_uid from public.profiles p
  where p.status = 'approved'
    and not exists (select 1 from public.guild_members m where m.profile_id = p.id)
    and not exists (select 1 from public.guild_members m where lower(m.pseudo) = lower(p.pseudo));
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.import_players_as_members() to authenticated;

-- 2. Rappels d'événements (notification in-app, et push si send-push est branché) --
alter table public.guild_events add column if not exists reminded_at timestamptz;

create or replace function public.notify_upcoming_events(p_hours int default 3)
returns int language plpgsql security definer set search_path = public as $$
declare e record; n int := 0;
begin
  for e in
    select id, title, kind, starts_at from public.guild_events
    where reminded_at is null and starts_at > now() and starts_at <= now() + make_interval(hours => p_hours)
  loop
    update public.guild_events set reminded_at = now() where id = e.id;
    perform public.notify_user(m.profile_id, null, 'event_reminder', e.title,
      'Rendez-vous à ' || to_char(e.starts_at at time zone 'UTC', 'HH24"h"MI') || ' — sois présent !', '/evenements', e.id)
    from public.guild_members m where m.is_active and m.profile_id is not null;
    n := n + 1;
  end loop;
  return n;
end;
$$;
-- Appelée uniquement par le planificateur, pas depuis le navigateur.
revoke execute on function public.notify_upcoming_events(int) from public, anon, authenticated;

-- Planification toutes les 15 minutes (activer d'abord l'extension pg_cron :
-- Supabase > Database > Extensions), puis décommenter :
-- select cron.schedule('guild-event-reminders', '*/15 * * * *', 'select public.notify_upcoming_events()');

-- 3. MVP du mois : un même membre peut le gagner plusieurs mois -----------------
alter table public.member_badges add column if not exists period date;
alter table public.member_badges drop constraint if exists member_badges_member_id_badge_id_key;
create unique index if not exists member_badges_unique_period
  on public.member_badges (member_id, badge_id, coalesce(period, date '1970-01-01'));

create or replace function public.award_monthly_mvp(p_month date default (date_trunc('month', now()) - interval '1 month')::date)
returns int language plpgsql security definer set search_path = public as $$
declare v_badge uuid; v_max int; n int;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  select id into v_badge from public.badges where label = 'MVP du mois';
  if v_badge is null then raise exception 'Badge « MVP du mois » introuvable'; end if;
  select max(season_points) into v_max from public.member_honor(p_month);
  if v_max is null or v_max <= 0 then return 0; end if;
  insert into public.member_badges (member_id, badge_id, period)
  select member_id, v_badge, p_month from public.member_honor(p_month) where season_points = v_max
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.award_monthly_mvp(date) to authenticated;
