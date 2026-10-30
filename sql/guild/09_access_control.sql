-- ============================================================================
-- 09 — Accès visiteurs / membres + correction des badges
-- Prérequis : 00 à 08. Additif et ré-exécutable.
--  • Visiteurs : voient les membres (profils), le Charo d'Or, les réalisations, les annonces.
--  • Membres approuvés (et admins) : voient en plus les classements d'honneur, les duos, le calendrier.
--  • Badges : un même badge peut être décerné plusieurs fois à un membre (ex. champion de 2 éditions).
-- ============================================================================

-- 1. Qui est « membre » ? (compte approuvé ou admin)
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.status = 'approved' or p.role in ('admin', 'super_admin'))
  );
$$;
grant execute on function public.is_member() to anon, authenticated;

-- 2. Tables réservées aux membres (lecture)
do $$
declare t text;
begin
  foreach t in array array['guild_events', 'guild_duos', 'honor_rules'] loop
    execute format('drop policy if exists "%s_select_public" on public.%I', t, t);
    execute format('drop policy if exists "%s_select_members" on public.%I', t, t);
    execute format('create policy "%s_select_members" on public.%I for select using (public.is_member())', t, t);
  end loop;
end $$;

-- 3. Fonctions de classement : vides pour les visiteurs
create or replace function public.guild_member_activity(p_days int default 30)
returns table (member_id uuid, events_count int, rate_pct int, activity text)
language sql stable security definer set search_path = public as $$
  with agg as (
    select m.id as member_id,
      count(a.id) filter (where a.status <> 'absent_justified')::int as counted,
      (count(a.id) filter (where a.status = 'present') + 0.5 * count(a.id) filter (where a.status = 'partial'))::numeric as pts
    from public.guild_members m
    left join public.event_attendance a on a.member_id = m.id
      and exists (select 1 from public.guild_events e where e.id = a.event_id and e.starts_at >= now() - make_interval(days => p_days))
    where m.is_active
    group by m.id
  )
  select member_id, counted,
    case when counted = 0 then 0 else round(100 * pts / counted)::int end,
    case when counted = 0 then 'nouveau'
         when 100 * pts / counted >= 70 then 'actif'
         when 100 * pts / counted >= 40 then 'irregulier'
         else 'inactif' end
  from agg where public.is_member();
$$;

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
  where m.is_active and public.is_member()
  group by m.id, m.pseudo, m.guild_role;
$$;

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
  select sc, case when sc >= 800 then 'Légende' when sc >= 400 then 'Or' when sc >= 150 then 'Argent' else 'Bronze' end, w, l, d, c, pct
  from s where public.is_member();
$$;

-- 4. Badges : plusieurs attributions possibles (l'unicité ne vaut que pour les badges périodiques, ex. MVP du mois)
drop index if exists public.member_badges_unique_period;
create unique index if not exists member_badges_unique_period
  on public.member_badges (member_id, badge_id, period) where period is not null;
