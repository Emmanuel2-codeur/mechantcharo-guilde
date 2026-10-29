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
