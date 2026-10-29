-- Installation complète de la vie de guilde (fichiers 00 à 08, dans l'ordre).

-- >>>>>>>>>> 00_audit.sql
-- ============================================================================
-- 00 — Journal d'audit des tables de la guilde (UNE seule fonction, à exécuter en premier)
-- Pour auditer une nouvelle table : ajouter une ligne dans audit_label() puis créer le trigger
--   create trigger trg_audit_<table> after insert or update or delete on public.<table>
--     for each row execute function public.fn_audit_guild();
-- Prérequis : table audit_log (sql/02_migration_complete.sql).
-- ============================================================================

create or replace function public.audit_label(p_table text, p_row jsonb)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_member text;
begin
  v_member := coalesce((select pseudo from public.guild_members where id = nullif(p_row ->> 'member_id', '')::uuid), '—');
  return case p_table
    when 'guild_members'      then p_row ->> 'pseudo'
    when 'guild_applications' then (p_row ->> 'pseudo') || ' : ' || (p_row ->> 'status')
    when 'guild_events'       then (p_row ->> 'title') || ' — ' || left(p_row ->> 'starts_at', 10)
    when 'honor_rules'        then (p_row ->> 'kind') || ' / ' || (p_row ->> 'status') || ' = ' || (p_row ->> 'points')
    when 'badges'             then p_row ->> 'label'
    when 'guild_duos'         then coalesce(nullif(p_row ->> 'name', ''), 'Duo') || ' — '
        || coalesce((select pseudo from public.guild_members where id = (p_row ->> 'member_a')::uuid), '?') || ' & '
        || coalesce((select pseudo from public.guild_members where id = (p_row ->> 'member_b')::uuid), '?')
        || ' (' || (p_row ->> 'points') || ' pts)'
    when 'charo_dor_records'  then coalesce((select label from public.charo_dor_titles where id = (p_row ->> 'title_id')::uuid), 'Charo d''Or')
        || ' : ' || v_member || coalesce(' (' || nullif(p_row ->> 'value', '') || ')', '')
    else v_member || ' : ' || coalesce(p_row ->> 'status', p_row ->> 'position', 'badge')
  end;
end;
$$;

create or replace function public.fn_audit_guild()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pseudo text; v_role text; v_row jsonb := to_jsonb(coalesce(new, old));
begin
  select pseudo, role into v_pseudo, v_role from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_pseudo, actor_role, action, entity_type, entity_id, entity_label)
  values (auth.uid(), v_pseudo, v_role, lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, public.audit_label(tg_table_name, v_row));
  return coalesce(new, old);
end;
$$;


-- >>>>>>>>>> 01_members_events_attendance.sql
-- ============================================================================
-- PHASE 2 : Vie de guilde (membres, événements, présences)
-- Additif uniquement : ne modifie ni profiles, ni matches, ni groups.
-- À exécuter une fois, en entier, dans le SQL Editor Supabase.
-- ============================================================================

-- 1. Membres de la guilde ----------------------------------------------------
-- Un membre peut exister sans compte (profile_id nul) : les admins saisissent les présences pour tous.
create table if not exists public.guild_members (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles(id) on delete set null,
  pseudo      text not null unique,
  ff_uid      text,
  guild_role  text not null default 'recrue' check (guild_role in ('chef','adjoint','ancien','membre','recrue')),
  joined_at   date not null default current_date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.guild_members add column if not exists game_rank text check (char_length(game_rank) <= 40);  -- rang en jeu (Héroïque…)

-- 2. Événements (guerres, guilde vs guilde, tournois, spéciaux) --------------
create table if not exists public.guild_events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('guerre','gvg','tournoi','special')),
  title      text not null,
  starts_at  timestamptz not null,
  notes      text,
  created_at timestamptz not null default now(),
  unique (kind, starts_at)
);
create index if not exists idx_guild_events_starts on public.guild_events(starts_at desc);

-- 3. Présences ---------------------------------------------------------------
create table if not exists public.event_attendance (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.guild_events(id) on delete cascade,
  member_id  uuid not null references public.guild_members(id) on delete cascade,
  status     text not null check (status in ('present','partial','absent_justified','absent_unjustified')),
  noted_by   uuid references public.profiles(id) on delete set null,
  noted_at   timestamptz not null default now(),
  unique (event_id, member_id)
);
create index if not exists idx_attendance_member on public.event_attendance(member_id);

-- 4. RLS ---------------------------------------------------------------------
alter table public.guild_members    enable row level security;
alter table public.guild_events     enable row level security;
alter table public.event_attendance enable row level security;

drop policy if exists "guild_members_select_public" on public.guild_members;
create policy "guild_members_select_public" on public.guild_members for select using (true);
drop policy if exists "guild_members_admin_write" on public.guild_members;
create policy "guild_members_admin_write" on public.guild_members for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "guild_events_select_public" on public.guild_events;
create policy "guild_events_select_public" on public.guild_events for select using (true);
drop policy if exists "guild_events_admin_write" on public.guild_events;
create policy "guild_events_admin_write" on public.guild_events for all using (public.is_admin()) with check (public.is_admin());

-- Le détail des présences est privé : admins + le membre concerné (via son compte).
drop policy if exists "attendance_select_own_or_admin" on public.event_attendance;
create policy "attendance_select_own_or_admin" on public.event_attendance for select
  using (public.is_admin() or exists (
    select 1 from public.guild_members m where m.id = member_id and m.profile_id = auth.uid()));
drop policy if exists "attendance_admin_write" on public.event_attendance;
create policy "attendance_admin_write" on public.event_attendance for all using (public.is_admin()) with check (public.is_admin());

-- 5. Activité publique (taux calculé, sans exposer le détail) ----------------
-- Score = (présent + 0,5 × partiel) / événements comptés. Les absences justifiées sont neutres.
-- Seuils : >= 70 % actif, >= 40 % irrégulier, sinon inactif. Sans événement noté : nouveau.
create or replace function public.guild_member_activity(p_days int default 30)
returns table (member_id uuid, events_count int, rate_pct int, activity text)
language sql stable security definer set search_path = public as $$
  with agg as (
    select m.id as member_id,
      count(a.id) filter (where a.status <> 'absent_justified')::int as counted,
      (count(a.id) filter (where a.status = 'present')
        + 0.5 * count(a.id) filter (where a.status = 'partial'))::numeric as pts
    from public.guild_members m
    left join public.event_attendance a on a.member_id = m.id
      and exists (select 1 from public.guild_events e
                  where e.id = a.event_id and e.starts_at >= now() - make_interval(days => p_days))
    where m.is_active
    group by m.id
  )
  select member_id, counted,
    case when counted = 0 then 0 else round(100 * pts / counted)::int end,
    case when counted = 0 then 'nouveau'
         when 100 * pts / counted >= 70 then 'actif'
         when 100 * pts / counted >= 40 then 'irregulier'
         else 'inactif' end
  from agg;
$$;
grant execute on function public.guild_member_activity(int) to anon, authenticated;

-- 6. Génération des guerres de guilde (mercredi, vendredi, samedi à 20h) ------
create or replace function public.generate_weekly_wars(p_weeks int default 4)
returns int
language plpgsql security definer set search_path = public as $$
declare
  d date; n int := 0; v_rows int;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  for d in select generate_series(current_date, current_date + (p_weeks * 7), interval '1 day')::date loop
    if extract(isodow from d) in (3, 5, 6) then
      insert into public.guild_events (kind, title, starts_at)
      values ('guerre', 'Guerre de guilde', (d + time '20:00')::timestamp at time zone 'UTC')
      on conflict (kind, starts_at) do nothing;
      get diagnostics v_rows = row_count;
      n := n + v_rows;
    end if;
  end loop;
  return n;
end;
$$;
grant execute on function public.generate_weekly_wars(int) to authenticated;

-- 7. Journal d'audit pour les nouvelles tables --------------------------------
-- (fonction d'audit : voir 00_audit.sql)

drop trigger if exists trg_audit_guild_members on public.guild_members;
create trigger trg_audit_guild_members after insert or update or delete on public.guild_members
  for each row execute function public.fn_audit_guild();
drop trigger if exists trg_audit_guild_events on public.guild_events;
create trigger trg_audit_guild_events after insert or update or delete on public.guild_events
  for each row execute function public.fn_audit_guild();
drop trigger if exists trg_audit_event_attendance on public.event_attendance;
create trigger trg_audit_event_attendance after insert or update or delete on public.event_attendance
  for each row execute function public.fn_audit_guild();


-- >>>>>>>>>> 02_honor_badges.sql
-- ============================================================================
-- PHASE 3 : Score d'honneur, classement des membres, badges
-- Prérequis : 04_guild_phase2.sql. Additif uniquement. À exécuter en une fois.
-- ============================================================================

-- 1. Résultat d'un événement (pour le score de la guilde) --------------------
alter table public.guild_events
  add column if not exists result text check (result in ('win','loss','draw'));

-- 2. Barème modifiable : points par type d'événement et par statut -----------
create table if not exists public.honor_rules (
  id     uuid primary key default gen_random_uuid(),
  kind   text not null check (kind in ('guerre','gvg','tournoi','special')),
  status text not null check (status in ('present','partial','absent_justified','absent_unjustified')),
  points int  not null default 0,
  unique (kind, status)
);
insert into public.honor_rules (kind, status, points) values
  ('guerre','present',10), ('guerre','partial',5), ('guerre','absent_justified',0), ('guerre','absent_unjustified',-5),
  ('gvg','present',15),    ('gvg','partial',7),    ('gvg','absent_justified',0),    ('gvg','absent_unjustified',-8),
  ('tournoi','present',10),('tournoi','partial',5),('tournoi','absent_justified',0),('tournoi','absent_unjustified',-3),
  ('special','present',5), ('special','partial',2),('special','absent_justified',0),('special','absent_unjustified',0)
on conflict (kind, status) do nothing;

-- 3. Classement individuel saisi par les admins -------------------------------
create table if not exists public.member_rankings (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null unique references public.guild_members(id) on delete cascade,
  position   int  not null check (position > 0),
  game_rank  text,                       -- rang en jeu (Héroïque, Grand Maître…), optionnel
  updated_at timestamptz not null default now()
);

-- 4. Badges ---------------------------------------------------------------------
create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,
  emoji       text not null default '🏅',
  description text
);
create table if not exists public.member_badges (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.guild_members(id) on delete cascade,
  badge_id   uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (member_id, badge_id)
);
insert into public.badges (label, emoji, description) values
  ('Champion de la Bataille des Charos', '🏆', 'Vainqueur d''une édition du tournoi'),
  ('MVP du mois', '⭐', 'Meilleur score d''honneur du mois'),
  ('Série de feu', '🔥', '10 guerres de guilde d''affilée')
on conflict (label) do nothing;

-- 5. RLS : lecture publique, écriture admin -------------------------------------
do $$
declare t text;
begin
  foreach t in array array['honor_rules','member_rankings','badges','member_badges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_public" on public.%I', t, t);
    execute format('create policy "%s_select_public" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- 6. Score d'honneur des membres (mois choisi + cumulé) ---------------------------
create or replace function public.member_honor(p_month date default (date_trunc('month', now()))::date)
returns table (member_id uuid, pseudo text, guild_role text, season_points int, total_points int, events_count int)
language sql stable security definer set search_path = public as $$
  select m.id, m.pseudo, m.guild_role,
    coalesce(sum(r.points) filter (where e.starts_at >= p_month and e.starts_at < p_month + interval '1 month'), 0)::int,
    coalesce(sum(r.points), 0)::int,
    count(a.id)::int
  from public.guild_members m
  left join public.event_attendance a on a.member_id = m.id
  left join public.guild_events e on e.id = a.event_id
  left join public.honor_rules r on r.kind = e.kind and r.status = a.status
  where m.is_active
  group by m.id, m.pseudo, m.guild_role;
$$;
grant execute on function public.member_honor(date) to anon, authenticated;

-- 7. Score de la guilde ---------------------------------------------------------------
-- score = 10 × victoires + 3 × nuls + 20 × tournois organisés + 2 × participation moyenne (30 j, en %)
-- Niveaux : Bronze < 150 <= Argent < 400 <= Or < 800 <= Légende
create or replace function public.guild_honor()
returns table (score int, level text, wins int, losses int, draws int, tournaments int, participation_pct int)
language sql stable security definer set search_path = public as $$
  with res as (
    select count(*) filter (where result = 'win')::int w,
           count(*) filter (where result = 'loss')::int l,
           count(*) filter (where result = 'draw')::int d
    from public.guild_events where kind in ('guerre','gvg') and starts_at < now()
  ), t as (
    select count(*)::int c from public.guild_events where kind = 'tournoi' and starts_at < now()
  ), p as (
    select coalesce(round(avg(rate_pct)), 0)::int pct from public.guild_member_activity(30) where events_count > 0
  ), s as (
    select res.w, res.l, res.d, t.c, p.pct, (10 * res.w + 3 * res.d + 20 * t.c + 2 * p.pct) as sc from res, t, p
  )
  select sc, case when sc >= 800 then 'Légende' when sc >= 400 then 'Or' when sc >= 150 then 'Argent' else 'Bronze' end,
         w, l, d, c, pct
  from s;
$$;
grant execute on function public.guild_honor() to anon, authenticated;

-- 8. Audit : libellés pour les nouvelles tables ---------------------------------------
-- (fonction d'audit : voir 00_audit.sql)

do $$
declare t text;
begin
  foreach t in array array['honor_rules','member_rankings','badges','member_badges'] loop
    execute format('drop trigger if exists trg_audit_%s on public.%I', t, t);
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.fn_audit_guild()', t, t);
  end loop;
end $$;


-- >>>>>>>>>> 03_tools_reminders_mvp.sql
-- ============================================================================
-- PHASE 4 : Import des membres, rappels d'événements, MVP du mois
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


-- >>>>>>>>>> 04_applications.sql
-- ============================================================================
-- Candidatures à la guilde (formulaire public + validation admin)
-- Prérequis : 04 (guild_members) et is_admin(). Additif uniquement.
-- ============================================================================

create table if not exists public.guild_applications (
  id           uuid primary key default gen_random_uuid(),
  pseudo       text not null check (char_length(pseudo) between 2 and 40),
  ff_uid       text not null check (char_length(ff_uid) between 4 and 20),
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 120),
  game_rank    text check (char_length(game_rank) <= 40),
  availability text check (char_length(availability) <= 200),
  message      text check (char_length(message) <= 800),
  status       text not null default 'pending' check (status in ('pending','accepted','rejected')),
  admin_note   text check (char_length(admin_note) <= 500),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
-- Une seule candidature en attente par email
create unique index if not exists guild_applications_one_pending
  on public.guild_applications (lower(email)) where status = 'pending';

-- RLS : personne ne lit ni n'écrit directement, sauf les admins. Le public passe par la fonction ci-dessous.
alter table public.guild_applications enable row level security;
drop policy if exists "applications_admin_all" on public.guild_applications;
create policy "applications_admin_all" on public.guild_applications for all
  using (public.is_admin()) with check (public.is_admin());

-- Dépôt public d'une candidature (anonyme autorisé) ---------------------------------
create or replace function public.submit_guild_application(
  p_pseudo text, p_ff_uid text, p_email text,
  p_game_rank text default null, p_availability text default null, p_message text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if p_pseudo is null or p_ff_uid is null or p_email is null then
    raise exception 'Pseudo, ID Free Fire et email sont obligatoires.';
  end if;
  if exists (select 1 from public.guild_applications where lower(email) = lower(trim(p_email)) and status = 'pending') then
    raise exception 'Une candidature avec cet email est déjà en attente.';
  end if;
  if exists (select 1 from public.guild_members where lower(pseudo) = lower(trim(p_pseudo))) then
    raise exception 'Ce pseudo est déjà membre de la guilde.';
  end if;
  if (select count(*) from public.guild_applications where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de candidatures en ce moment, réessaie plus tard.';
  end if;

  insert into public.guild_applications (pseudo, ff_uid, email, game_rank, availability, message)
  values (trim(p_pseudo), trim(p_ff_uid), trim(p_email), nullif(trim(p_game_rank), ''), nullif(trim(p_availability), ''), nullif(trim(p_message), ''));

  -- Avertit les admins dans leur centre de notifications
  for a in select id from public.profiles where role in ('admin', 'super_admin') loop
    perform public.notify_user(a.id, null, 'application', 'Nouvelle candidature', trim(p_pseudo) || ' souhaite rejoindre la guilde.', '/admin?tab=guilde');
  end loop;
end;
$$;
grant execute on function public.submit_guild_application(text, text, text, text, text, text) to anon, authenticated;

-- Décision admin : accepter crée le membre (recrue) ---------------------------------------
create or replace function public.review_guild_application(p_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare app public.guild_applications;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'Décision invalide'; end if;
  select * into app from public.guild_applications where id = p_id for update;
  if not found then raise exception 'Candidature introuvable'; end if;
  if app.status <> 'pending' then raise exception 'Candidature déjà traitée'; end if;

  if p_decision = 'accepted' then
    if exists (select 1 from public.guild_members where lower(pseudo) = lower(app.pseudo)) then
      raise exception 'Un membre « % » existe déjà : modifie la candidature ou refuse-la.', app.pseudo;
    end if;
    insert into public.guild_members (pseudo, ff_uid, guild_role, game_rank) values (app.pseudo, app.ff_uid, 'recrue', app.game_rank);
  end if;

  update public.guild_applications
    set status = p_decision, admin_note = nullif(trim(p_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
end;
$$;
grant execute on function public.review_guild_application(uuid, text, text) to authenticated;

-- Audit ------------------------------------------------------------------------------------
-- (fonction d'audit : voir 00_audit.sql)
drop trigger if exists trg_audit_guild_applications on public.guild_applications;
create trigger trg_audit_guild_applications after update or delete on public.guild_applications
  for each row execute function public.fn_audit_guild();


-- >>>>>>>>>> 05_sync_members_players.sql
-- ============================================================================
-- Les joueurs acceptés par les admins SONT les membres de la guilde
-- Prérequis : 04 (guild_members). Additif : ne supprime rien.
--  • Quand un admin approuve un joueur (profiles.status = 'approved'), il devient membre.
--  • S'il est refusé ou remis en attente, il est désactivé (historique conservé).
--  • Rattrapage immédiat de tous les joueurs déjà approuvés.
-- ============================================================================

create or replace function public.sync_member_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' then
    -- Un membre saisi à la main avec le même pseudo (ex. candidature acceptée) est simplement relié au compte.
    update public.guild_members set profile_id = new.id, is_active = true
      where profile_id is null and lower(pseudo) = lower(new.pseudo);
    if not found then
      insert into public.guild_members (profile_id, pseudo, ff_uid, guild_role)
      values (new.id, new.pseudo, new.ff_uid, 'membre')
      on conflict (profile_id) do update set is_active = true;
    end if;
  else
    update public.guild_members set is_active = false where profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_member_from_profile on public.profiles;
create trigger trg_sync_member_from_profile
  after insert or update of status on public.profiles
  for each row execute function public.sync_member_from_profile();

-- Rattrapage : joueurs déjà approuvés
update public.guild_members m set profile_id = p.id, is_active = true
  from public.profiles p
  where p.status = 'approved' and m.profile_id is null and lower(m.pseudo) = lower(p.pseudo)
    and not exists (select 1 from public.guild_members x where x.profile_id = p.id);

insert into public.guild_members (profile_id, pseudo, ff_uid, guild_role)
select p.id, p.pseudo, p.ff_uid, 'membre' from public.profiles p
where p.status = 'approved' and not exists (select 1 from public.guild_members m where m.profile_id = p.id)
on conflict do nothing;


-- >>>>>>>>>> 06_duos.sql
-- ============================================================================
-- Classement des duos (saisi par les admins)
-- Prérequis : 04 (guild_members) et 05/07 (fn_audit_guild). Additif uniquement.
-- ============================================================================

create table if not exists public.guild_duos (
  id         uuid primary key default gen_random_uuid(),
  name       text check (char_length(name) <= 40),
  member_a   uuid not null references public.guild_members(id) on delete cascade,
  member_b   uuid not null references public.guild_members(id) on delete cascade,
  points     int  not null default 0,
  wins       int  not null default 0 check (wins >= 0),
  losses     int  not null default 0 check (losses >= 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint guild_duos_distinct check (member_a <> member_b)
);
-- Un même couple ne peut exister qu'une fois, quel que soit l'ordre A/B
create unique index if not exists guild_duos_pair
  on public.guild_duos (least(member_a::text, member_b::text), greatest(member_a::text, member_b::text));

alter table public.guild_duos enable row level security;
drop policy if exists "guild_duos_select_public" on public.guild_duos;
create policy "guild_duos_select_public" on public.guild_duos for select using (true);
drop policy if exists "guild_duos_admin_write" on public.guild_duos;
create policy "guild_duos_admin_write" on public.guild_duos for all using (public.is_admin()) with check (public.is_admin());

-- Audit : libellé lisible pour les duos
-- (fonction d'audit : voir 00_audit.sql)

drop trigger if exists trg_audit_guild_duos on public.guild_duos;
create trigger trg_audit_guild_duos after insert or update or delete on public.guild_duos
  for each row execute function public.fn_audit_guild();


-- >>>>>>>>>> 07_charo_dor.sql
-- ============================================================================
-- 07 — CHARO D'OR : les titres de la guilde, désignés par les admins
-- Prérequis : 00_audit.sql et 01_members_events_attendance.sql. Additif uniquement.
-- ============================================================================

create table if not exists public.charo_dor_titles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null,
  description text,
  value_hint  text,                       -- aide à la saisie (ex. « Niveau », « Kills »)
  sort_order  int  not null default 0
);

insert into public.charo_dor_titles (code, label, description, value_hint, sort_order) values
  ('saison',         'Meilleur joueur de la saison',            'Le meilleur joueur d''une saison de guilde (3 mois)',      'Saison',        1),
  ('br_level',       'Plus haut niveau BR',                     'Le joueur de la guilde au plus haut niveau en BR',          'Niveau BR',     2),
  ('cs_level',       'Plus haut niveau CS',                     'Le joueur de la guilde au plus haut niveau en CS',          'Niveau CS',     3),
  ('gvg_onetap',     'Plus haut kill one tap des GVG',          'Record de kills one tap en guilde vs guilde',               'Kills one tap', 4),
  ('gvg_spam',       'Plus haut kill spam des GVG',             'Record de kills spam en guilde vs guilde',                  'Kills spam',    5),
  ('war_points',     'Plus haut point des guerres de guilde',   'Record de points en guerre de guilde',                      'Points',        6),
  ('weekly_contrib', 'Record de contribution hebdomadaire',     'Record de contribution hebdomadaire de la guilde',          'Contribution',  7)
on conflict (code) do nothing;

-- Un enregistrement par attribution. Un seul détenteur « actuel » par titre ; les anciens forment l'historique.
create table if not exists public.charo_dor_records (
  id         uuid primary key default gen_random_uuid(),
  title_id   uuid not null references public.charo_dor_titles(id) on delete cascade,
  member_id  uuid not null references public.guild_members(id) on delete cascade,
  value      text check (char_length(value) <= 60),
  season     text check (char_length(season) <= 60),
  note       text check (char_length(note) <= 300),
  is_current boolean not null default true,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id) on delete set null
);
create unique index if not exists charo_dor_one_current on public.charo_dor_records (title_id) where is_current;
create index if not exists idx_charo_dor_history on public.charo_dor_records (title_id, awarded_at desc);

alter table public.charo_dor_titles  enable row level security;
alter table public.charo_dor_records enable row level security;
drop policy if exists "charo_dor_titles_select_public" on public.charo_dor_titles;
create policy "charo_dor_titles_select_public" on public.charo_dor_titles for select using (true);
drop policy if exists "charo_dor_titles_admin_write" on public.charo_dor_titles;
create policy "charo_dor_titles_admin_write" on public.charo_dor_titles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "charo_dor_records_select_public" on public.charo_dor_records;
create policy "charo_dor_records_select_public" on public.charo_dor_records for select using (true);
drop policy if exists "charo_dor_records_admin_write" on public.charo_dor_records;
create policy "charo_dor_records_admin_write" on public.charo_dor_records for all using (public.is_admin()) with check (public.is_admin());

-- Désigner le détenteur d'un titre : l'ancien passe dans l'historique.
create or replace function public.set_charo_dor_holder(
  p_title uuid, p_member uuid, p_value text default null, p_season text default null, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  update public.charo_dor_records set is_current = false where title_id = p_title and is_current;
  insert into public.charo_dor_records (title_id, member_id, value, season, note, awarded_by)
  values (p_title, p_member, nullif(trim(p_value), ''), nullif(trim(p_season), ''), nullif(trim(p_note), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.set_charo_dor_holder(uuid, uuid, text, text, text) to authenticated;

-- Laisser un titre vacant (le détenteur actuel part dans l'historique).
create or replace function public.clear_charo_dor_holder(p_title uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  update public.charo_dor_records set is_current = false where title_id = p_title and is_current;
end;
$$;
grant execute on function public.clear_charo_dor_holder(uuid) to authenticated;

drop trigger if exists trg_audit_charo_dor_records on public.charo_dor_records;
create trigger trg_audit_charo_dor_records after insert or update or delete on public.charo_dor_records
  for each row execute function public.fn_audit_guild();


-- >>>>>>>>>> 08_merge_member_rankings.sql
-- ============================================================================
-- 08 — Fusion du « classement des membres saisi à la main » dans le profil du membre
-- Le rang en jeu devient le champ guild_members.game_rank ; l'honneur est le seul classement des membres.
-- Sûr : copie le rang en jeu, et ne supprime la table que si elle est vide.
-- ============================================================================
alter table public.guild_members add column if not exists game_rank text check (char_length(game_rank) <= 40);

do $$
declare n int;
begin
  if to_regclass('public.member_rankings') is not null then
    update public.guild_members m set game_rank = r.game_rank
      from public.member_rankings r where r.member_id = m.id and r.game_rank is not null and m.game_rank is null;
    select count(*) into n from public.member_rankings;
    if n = 0 then
      drop table public.member_rankings;
      raise notice 'Table member_rankings supprimée (elle était vide).';
    else
      raise notice 'Table member_rankings conservée (% lignes) : rangs en jeu copiés, positions manuelles non reprises. Supprime-la à la main quand tu es prêt.', n;
    end if;
  end if;
end $$;
