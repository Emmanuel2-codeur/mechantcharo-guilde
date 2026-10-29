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
