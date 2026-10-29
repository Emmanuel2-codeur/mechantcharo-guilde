-- ============================================================================
-- 08 — Les joueurs acceptés par les admins SONT les membres de la guilde
-- Prérequis : 04 (guild_members). Additif : ne supprime rien.
--  • Quand un admin approuve un joueur (profiles.status = 'approved'), il devient membre.
--  • S'il est refusé ou remis en attente, il est désactivé (historique conservé).
--  • Rattrapage immédiat de tous les joueurs déjà approuvés.
-- ============================================================================

create or replace function public.sync_member_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' then
    -- Un membre saisi à la main avec le même pseudo (ex. candidature acceptée) est simplement relié au compte.
    update public.guild_members set profile_id = new.id, is_active = true
      where profile_id is null and lower(pseudo) = lower(new.pseudo);
    if not found then
      insert into public.guild_members (profile_id, pseudo, ff_uid, guild_role)
      values (new.id, new.pseudo, new.ff_uid, 'membre')
      on conflict (profile_id) do update set is_active = true;
    end if;
  else
    update public.guild_members set is_active = false where profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_member_from_profile on public.profiles;
create trigger trg_sync_member_from_profile
  after insert or update of status on public.profiles
  for each row execute function public.sync_member_from_profile();

-- Rattrapage : joueurs déjà approuvés
update public.guild_members m set profile_id = p.id, is_active = true
  from public.profiles p
  where p.status = 'approved' and m.profile_id is null and lower(m.pseudo) = lower(p.pseudo)
    and not exists (select 1 from public.guild_members x where x.profile_id = p.id);

insert into public.guild_members (profile_id, pseudo, ff_uid, guild_role)
select p.id, p.pseudo, p.ff_uid, 'membre' from public.profiles p
where p.status = 'approved' and not exists (select 1 from public.guild_members m where m.profile_id = p.id)
on conflict do nothing;
