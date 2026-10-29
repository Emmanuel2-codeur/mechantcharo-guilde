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
