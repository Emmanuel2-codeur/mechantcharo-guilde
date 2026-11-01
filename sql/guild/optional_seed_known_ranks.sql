-- OPTIONNEL — enregistre les titres de gloire visibles en jeu (capture « Les honneurs de MECHANTCHARO »)
-- N°65 au Togo (2026.06), N°2 au Togo (2026.09), et le classement actuel N°1 s'il n'y en a pas encore.
insert into public.guild_rank_history (rank, scope, period_label, is_current)
select 65, 'Togo', '2026.06', false where not exists (select 1 from public.guild_rank_history where rank = 65 and period_label = '2026.06');
insert into public.guild_rank_history (rank, scope, period_label, is_current)
select 2, 'Togo', '2026.09', false where not exists (select 1 from public.guild_rank_history where rank = 2 and period_label = '2026.09');
insert into public.guild_rank_history (rank, scope, is_current, started_on)
select 1, 'Togo', true, current_date where not exists (select 1 from public.guild_rank_history where is_current);
