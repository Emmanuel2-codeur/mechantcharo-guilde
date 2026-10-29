-- ============================================================================
-- 09 — Classement des duos (saisi par les admins)
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
create or replace function public.fn_audit_guild()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pseudo text; v_role text; v_label text; v_row jsonb := to_jsonb(coalesce(new, old));
begin
  select pseudo, role into v_pseudo, v_role from public.profiles where id = auth.uid();
  if tg_table_name = 'guild_members' then v_label := v_row ->> 'pseudo';
  elsif tg_table_name = 'guild_applications' then v_label := (v_row ->> 'pseudo') || ' : ' || (v_row ->> 'status');
  elsif tg_table_name = 'guild_duos' then
    v_label := coalesce(nullif(v_row ->> 'name', ''), 'Duo') || ' — '
      || coalesce((select pseudo from public.guild_members where id = (v_row ->> 'member_a')::uuid), '?') || ' & '
      || coalesce((select pseudo from public.guild_members where id = (v_row ->> 'member_b')::uuid), '?')
      || ' (' || (v_row ->> 'points') || ' pts)';
  elsif tg_table_name = 'guild_events' then v_label := (v_row ->> 'title') || ' — ' || left(v_row ->> 'starts_at', 10);
  elsif tg_table_name = 'honor_rules' then v_label := (v_row ->> 'kind') || ' / ' || (v_row ->> 'status') || ' = ' || (v_row ->> 'points');
  elsif tg_table_name = 'badges' then v_label := v_row ->> 'label';
  else v_label := coalesce((select pseudo from public.guild_members where id = (v_row ->> 'member_id')::uuid), '—')
                  || ' : ' || coalesce(v_row ->> 'status', v_row ->> 'position', 'badge');
  end if;
  insert into public.audit_log (actor_id, actor_pseudo, actor_role, action, entity_type, entity_id, entity_label)
  values (auth.uid(), v_pseudo, v_role, lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, v_label);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_guild_duos on public.guild_duos;
create trigger trg_audit_guild_duos after insert or update or delete on public.guild_duos
  for each row execute function public.fn_audit_guild();
