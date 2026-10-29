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
