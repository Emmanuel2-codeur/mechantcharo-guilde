-- ============================================================================
-- 08 — Fusion du « classement des membres saisi à la main » dans le profil du membre
-- Le rang en jeu devient le champ guild_members.game_rank ; l'honneur est le seul classement des membres.
-- Sûr : copie le rang en jeu, et ne supprime la table que si elle est vide.
-- ============================================================================
alter table public.guild_members add column if not exists game_rank text check (char_length(game_rank) <= 40);

do $$
declare n int;
begin
  if to_regclass('public.member_rankings') is not null then
    update public.guild_members m set game_rank = r.game_rank
      from public.member_rankings r where r.member_id = m.id and r.game_rank is not null and m.game_rank is null;
    select count(*) into n from public.member_rankings;
    if n = 0 then
      drop table public.member_rankings;
      raise notice 'Table member_rankings supprimée (elle était vide).';
    else
      raise notice 'Table member_rankings conservée (% lignes) : rangs en jeu copiés, positions manuelles non reprises. Supprime-la à la main quand tu es prêt.', n;
    end if;
  end if;
end $$;
