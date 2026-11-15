-- ============================================================================
-- 11 — Candidatures v2 : formulaire en 3 étapes, règlement accepté, email d'alerte
-- Prérequis : 04_applications.sql et 09_access_control.sql. Additif et ré-exécutable.
--  • Origine du candidat : togolais ? parle éwé ? sinon pays.
--  • Règlement de la guilde versionné ; le candidat doit l'accepter (date + version enregistrées).
--  • Le candidat connecté retrouve sa candidature dans « Mon profil » (profile_id).
-- ============================================================================

alter table public.guild_applications add column if not exists is_togolese       boolean;
alter table public.guild_applications add column if not exists speaks_ewe        boolean;
alter table public.guild_applications add column if not exists country           text check (char_length(country) <= 60);
alter table public.guild_applications add column if not exists rules_accepted_at timestamptz;
alter table public.guild_applications add column if not exists rules_version     int;
alter table public.guild_applications add column if not exists profile_id        uuid references public.profiles(id) on delete set null;
alter table public.guild_applications add column if not exists notified_at       timestamptz;  -- email d'alerte déjà envoyé

-- Un candidat connecté peut lire SA candidature (statut), rien d'autre.
drop policy if exists "applications_select_own" on public.guild_applications;
create policy "applications_select_own" on public.guild_applications for select using (profile_id = auth.uid());

-- 1. Règlement de la guilde (versionné, modifiable par les admins) -------------------
create table if not exists public.guild_rules (
  id         uuid primary key default gen_random_uuid(),
  version    int  not null unique,
  body       text not null check (char_length(body) between 20 and 8000),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create unique index if not exists guild_rules_one_current on public.guild_rules ((true)) where is_current;

alter table public.guild_rules enable row level security;
drop policy if exists "guild_rules_select_public" on public.guild_rules;
create policy "guild_rules_select_public" on public.guild_rules for select using (true);
drop policy if exists "guild_rules_admin_write" on public.guild_rules;
create policy "guild_rules_admin_write" on public.guild_rules for all using (public.is_admin()) with check (public.is_admin());

insert into public.guild_rules (version, body, is_current)
select 1, E'1. Respect\nRespecte tous les membres, les chefs et les adversaires. Pas d''insultes, de moqueries ni de harcèlement, en jeu comme sur WhatsApp.\n\n2. Participation\nLes guerres de guilde ont lieu le mercredi, le vendredi et le samedi. Les membres participent aux guerres et aux guildes vs guildes. Une absence doit être signalée à l''avance à un admin.\n\n3. Fair-play\nAucun logiciel de triche, hack, bug exploité ni compte partagé. Toute triche entraîne l''exclusion immédiate.\n\n4. Activité\nUn membre inactif sans explication pendant plusieurs événements peut être retiré de la guilde.\n\n5. Représenter la guilde\nTu portes les couleurs de MÉCHANTCHARO : garde un comportement exemplaire, aussi dans les tournois externes.\n\n6. Discipline\nLes décisions des chefs et des admins sont respectées. En cas de désaccord, on en parle calmement en privé.\n\n7. Départ\nSi tu quittes la guilde, préviens un admin. Les informations et stratégies internes restent confidentielles.\n\n8. Sanctions\nLe non-respect du règlement peut entraîner un avertissement, une mise à l''écart ou l''exclusion.\n\nEn envoyant ma candidature, je confirme avoir lu ce règlement et je l''accepte.', true
where not exists (select 1 from public.guild_rules);

-- Publier une nouvelle version (l'ancienne reste archivée)
create or replace function public.publish_guild_rules(p_body text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  select coalesce(max(version), 0) + 1 into v from public.guild_rules;
  update public.guild_rules set is_current = false where is_current;
  insert into public.guild_rules (version, body, is_current, created_by) values (v, trim(p_body), true, auth.uid());
  return v;
end;
$$;
grant execute on function public.publish_guild_rules(text) to authenticated;

-- 2. Dépôt d'une candidature (nouvelle signature : remplace l'ancienne à 6 paramètres) -------
drop function if exists public.submit_guild_application(text, text, text, text, text, text);

create or replace function public.submit_guild_application(
  p_pseudo text, p_ff_uid text, p_email text,
  p_game_rank text, p_message text,
  p_is_togolese boolean, p_speaks_ewe boolean, p_country text,
  p_rules_accepted boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a record; v_id uuid; v_email text; v_rules int; v_country text;
begin
  if nullif(trim(p_pseudo), '') is null or nullif(trim(p_ff_uid), '') is null then
    raise exception 'Pseudo et ID Free Fire sont obligatoires.';
  end if;
  if not coalesce(p_rules_accepted, false) then
    raise exception 'Tu dois accepter le règlement de la guilde pour envoyer ta candidature.';
  end if;
  if p_is_togolese is null then raise exception 'Indique si tu es togolais.'; end if;

  if p_is_togolese then
    if p_speaks_ewe is null then raise exception 'Indique si tu parles éwé.'; end if;
    v_country := 'Togo';
  else
    v_country := nullif(trim(p_country), '');
    if v_country is null or char_length(v_country) < 2 then raise exception 'Indique ton pays.'; end if;
  end if;

  -- Connecté : l'email du compte fait foi (impossible d'en saisir un autre) et la candidature est liée au compte.
  v_email := coalesce((select u.email from auth.users u where u.id = auth.uid()), trim(p_email));
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email invalide.'; end if;

  -- Email déjà lié à un compte alors que le visiteur n'est pas connecté : on refuse, il doit se connecter.
  if auth.uid() is null and exists (select 1 from auth.users u where lower(u.email) = lower(v_email)) then
    raise exception 'Cet email est déjà lié à un compte. Connecte-toi pour envoyer ta candidature.';
  end if;
  -- Déjà membre (compte approuvé ou admin)
  if exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where lower(u.email) = lower(v_email) and (p.status = 'approved' or p.role in ('admin', 'super_admin'))
  ) then
    raise exception 'Tu es déjà membre de la guilde : il n''y a pas de candidature à envoyer.';
  end if;
  -- Même ID Free Fire déjà en attente ou déjà accepté
  if exists (select 1 from public.guild_applications where ff_uid = trim(p_ff_uid) and status in ('pending', 'accepted')) then
    raise exception 'Cet ID Free Fire a déjà une candidature en attente ou acceptée.';
  end if;
  if exists (select 1 from public.guild_applications where lower(email) = lower(v_email) and status = 'pending') then
    raise exception 'Une candidature avec cet email est déjà en attente.';
  end if;
  if exists (select 1 from public.guild_members where lower(pseudo) = lower(trim(p_pseudo))) then
    raise exception 'Ce pseudo est déjà membre de la guilde.';
  end if;
  if (select count(*) from public.guild_applications where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de candidatures en ce moment, réessaie plus tard.';
  end if;

  select version into v_rules from public.guild_rules where is_current;

  insert into public.guild_applications
    (pseudo, ff_uid, email, game_rank, message, is_togolese, speaks_ewe, country, rules_accepted_at, rules_version, profile_id)
  values
    (trim(p_pseudo), trim(p_ff_uid), v_email, nullif(trim(p_game_rank), ''), nullif(trim(p_message), ''),
     p_is_togolese, case when p_is_togolese then p_speaks_ewe else null end, v_country, now(), v_rules, auth.uid())
  returning id into v_id;

  for a in select id from public.profiles where role in ('admin', 'super_admin') loop
    perform public.notify_user(a.id, null, 'application', 'Nouvelle candidature', trim(p_pseudo) || ' souhaite rejoindre la guilde.', '/admin?tab=guilde&sub=candidatures');
  end loop;

  return v_id;
end;
$$;
grant execute on function public.submit_guild_application(text, text, text, text, text, boolean, boolean, text, boolean) to anon, authenticated;
