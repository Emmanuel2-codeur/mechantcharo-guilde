-- ============================================================================
-- 12 — Candidatures : état d'un email (compte accepté / en attente) + refus des doublons
-- Prérequis : 11_applications_v2.sql. Ré-exécutable (remplace submit_guild_application).
-- ============================================================================

-- État d'un email pour le formulaire « Rejoindre la guilde » :
--   'member'  = compte déjà accepté (ou admin) → on propose de se connecter
--   'waiting' = compte non encore accepté ou candidature en attente → on dit de patienter
--   'none'    = rien → il peut envoyer sa candidature
create or replace function public.email_join_status(p_email text)
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select case
    when exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(trim(p_email)) and (p.status = 'approved' or p.role in ('admin', 'super_admin'))
    ) then 'member'
    when exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)))
      or exists (select 1 from public.guild_applications a where lower(a.email) = lower(trim(p_email)) and a.status = 'pending')
    then 'waiting'
    else 'none'
  end;
$$;
revoke all on function public.email_join_status(text) from public;
grant execute on function public.email_join_status(text) to anon, authenticated;

create or replace function public.submit_guild_application(
  p_pseudo text, p_ff_uid text, p_email text,
  p_game_rank text, p_message text,
  p_is_togolese boolean, p_speaks_ewe boolean, p_country text,
  p_rules_accepted boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a record; v_id uuid; v_email text; v_rules int; v_country text; v_status text;
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

  -- Visiteur non connecté : état de cet email (compte accepté / en attente)
  if auth.uid() is null then
    v_status := public.email_join_status(v_email);
    if v_status = 'member' then
      raise exception 'Cet email a déjà un compte accepté. Connecte-toi pour accéder à la guilde.';
    elsif v_status = 'waiting' then
      raise exception 'Une demande est déjà en attente pour cet email. Patiente, un admin va l''examiner.';
    end if;
  end if;
  -- Connecté et déjà membre
  if exists (select 1 from public.profiles p where p.id = auth.uid() and (p.status = 'approved' or p.role in ('admin', 'super_admin'))) then
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
