-- ============================================================================
-- 00 — Journal d'audit des tables de la guilde (UNE seule fonction, à exécuter en premier)
-- Pour auditer une nouvelle table : ajouter une ligne dans audit_label() puis créer le trigger
--   create trigger trg_audit_<table> after insert or update or delete on public.<table>
--     for each row execute function public.fn_audit_guild();
-- Prérequis : table audit_log (sql/02_migration_complete.sql).
-- ============================================================================

create or replace function public.audit_label(p_table text, p_row jsonb)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_member text;
begin
  v_member := coalesce((select pseudo from public.guild_members where id = nullif(p_row ->> 'member_id', '')::uuid), '—');
  return case p_table
    when 'guild_members'      then p_row ->> 'pseudo'
    when 'guild_applications' then (p_row ->> 'pseudo') || ' : ' || (p_row ->> 'status')
    when 'guild_events'       then (p_row ->> 'title') || ' — ' || left(p_row ->> 'starts_at', 10)
    when 'honor_rules'        then (p_row ->> 'kind') || ' / ' || (p_row ->> 'status') || ' = ' || (p_row ->> 'points')
    when 'badges'             then p_row ->> 'label'
    when 'guild_duos'         then coalesce(nullif(p_row ->> 'name', ''), 'Duo') || ' — '
        || coalesce((select pseudo from public.guild_members where id = (p_row ->> 'member_a')::uuid), '?') || ' & '
        || coalesce((select pseudo from public.guild_members where id = (p_row ->> 'member_b')::uuid), '?')
        || ' (' || (p_row ->> 'points') || ' pts)'
    when 'guild_rank_history' then 'N°' || (p_row ->> 'rank') || ' ' || coalesce(p_row ->> 'scope', '') || coalesce(' — ' || nullif(p_row ->> 'period_label', ''), '')
    when 'guild_achievements' then (p_row ->> 'kind') || ' : ' || (p_row ->> 'title')
    when 'charo_dor_records'  then coalesce((select label from public.charo_dor_titles where id = (p_row ->> 'title_id')::uuid), 'Charo d''Or')
        || ' : ' || v_member || coalesce(' (' || nullif(p_row ->> 'value', '') || ')', '')
    else v_member || ' : ' || coalesce(p_row ->> 'status', p_row ->> 'position', 'badge')
  end;
end;
$$;

create or replace function public.fn_audit_guild()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pseudo text; v_role text; v_row jsonb := to_jsonb(coalesce(new, old));
begin
  select pseudo, role into v_pseudo, v_role from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_pseudo, actor_role, action, entity_type, entity_id, entity_label)
  values (auth.uid(), v_pseudo, v_role, lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, public.audit_label(tg_table_name, v_row));
  return coalesce(new, old);
end;
$$;
