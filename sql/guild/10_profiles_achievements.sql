-- ============================================================================
-- 10 — Profils de membres, réalisations de la guilde, Charo d'Or externe
-- Prérequis : 00 (audit), 01 (membres), 07 (Charo d'Or), 09 (is_member). Additif et ré-exécutable.
-- ============================================================================

-- 1. Profil personnalisé des membres (photo, présentation, distinctions, anciennes guildes)
alter table public.guild_members add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);
alter table public.guild_members add column if not exists bio text check (bio is null or char_length(bio) <= 400);

create table if not exists public.member_distinctions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.guild_members(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 80),
  detail     text check (char_length(detail) <= 200),
  created_at timestamptz not null default now()
);
create table if not exists public.member_past_guilds (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.guild_members(id) on delete cascade,
  guild_name text not null check (char_length(guild_name) between 2 and 60),
  period     text check (char_length(period) <= 40),
  created_at timestamptz not null default now()
);

create or replace function public.owns_member(p_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.guild_members m where m.id = p_member and m.profile_id = auth.uid());
$$;
grant execute on function public.owns_member(uuid) to anon, authenticated;

-- 20 éléments maximum par membre et par liste
create or replace function public.limit_member_items()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from public.%I where member_id = $1', tg_table_name) into n using new.member_id;
  if n >= 20 then raise exception 'Maximum 20 éléments par liste.'; end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['member_distinctions', 'member_past_guilds'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_public" on public.%I', t, t);
    execute format('create policy "%s_select_public" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s_owner_write" on public.%I', t, t);
    execute format('create policy "%s_owner_write" on public.%I for all using (public.is_admin() or public.owns_member(member_id)) with check (public.is_admin() or public.owns_member(member_id))', t, t);
    execute format('drop trigger if exists trg_limit_%s on public.%I', t, t);
    execute format('create trigger trg_limit_%s before insert on public.%I for each row execute function public.limit_member_items()', t, t);
  end loop;
end $$;

-- Le membre modifie SA photo et SA présentation (rien d'autre) ; la photo est aussi copiée sur son profil joueur.
create or replace function public.update_my_member_profile(p_bio text, p_avatar_url text default null, p_remove_avatar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  select id into v_member from public.guild_members where profile_id = auth.uid() and is_active;
  if v_member is null then raise exception 'Tu dois être membre approuvé de la guilde.'; end if;
  if p_avatar_url is not null and p_avatar_url !~ '^https://[^/]+/storage/v1/object/public/announcement-media/avatars/' then
    raise exception 'Adresse de photo invalide.';
  end if;
  update public.guild_members set
    bio = nullif(trim(p_bio), ''),
    avatar_url = case when p_remove_avatar then null when p_avatar_url is not null then p_avatar_url else avatar_url end
  where id = v_member;
  if p_remove_avatar then update public.profiles set avatar_url = null where id = auth.uid();
  elsif p_avatar_url is not null then update public.profiles set avatar_url = p_avatar_url where id = auth.uid();
  end if;
end;
$$;
grant execute on function public.update_my_member_profile(text, text, boolean) to authenticated;

-- 2. Réalisations de la guilde (page publique)
create table if not exists public.guild_rank_history (
  id           uuid primary key default gen_random_uuid(),
  rank         int  not null check (rank between 1 and 999),
  scope        text not null default 'Togo' check (char_length(scope) <= 40),
  period_label text check (char_length(period_label) <= 60),
  note         text check (char_length(note) <= 200),
  is_current   boolean not null default false,
  started_on   date,
  ended_on     date,
  created_at   timestamptz not null default now()
);
create unique index if not exists guild_rank_one_current on public.guild_rank_history ((true)) where is_current;

create table if not exists public.guild_achievements (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('gvg_win', 'distinction', 'palmares')),
  title       text not null check (char_length(title) between 2 and 80),
  detail      text check (char_length(detail) <= 200),
  achieved_on date,
  created_at  timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['guild_rank_history', 'guild_achievements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_public" on public.%I', t, t);
    execute format('create policy "%s_select_public" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I', t, t);
    execute format('create policy "%s_admin_write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('drop trigger if exists trg_audit_%s on public.%I', t, t);
    execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.fn_audit_guild()', t, t);
  end loop;
end $$;

-- Définir le classement actuel : l'ancien passe dans le passé avec sa date de fin.
create or replace function public.set_current_guild_rank(p_rank int, p_scope text default 'Togo', p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  update public.guild_rank_history set is_current = false, ended_on = current_date where is_current;
  insert into public.guild_rank_history (rank, scope, note, is_current, started_on)
  values (p_rank, coalesce(nullif(trim(p_scope), ''), 'Togo'), nullif(trim(p_note), ''), true, current_date)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.set_current_guild_rank(int, text, text) to authenticated;

-- 3. Charo d'Or : meilleur joueur des tournois externes (la valeur saisie = le tournoi gagné)
insert into public.charo_dor_titles (code, label, description, value_hint, sort_order) values
  ('tournois_externes', 'Meilleur joueur des tournois externes', 'Le joueur qui brille le plus dans les tournois organisés hors de la guilde', 'Tournoi', 8)
on conflict (code) do nothing;
