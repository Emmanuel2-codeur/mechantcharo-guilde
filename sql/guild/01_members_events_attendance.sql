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
