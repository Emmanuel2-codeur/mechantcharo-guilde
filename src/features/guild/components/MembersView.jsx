import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { Card, QueryState, EmptyState } from '@/shared/ui'
import { GUILD_ROLES, ACTIVITY, roleLabel } from '@/features/guild/guild'

const roleOrder = (r) => GUILD_ROLES.findIndex((x) => x.value === r)

/** Liste publique des membres (les joueurs acceptés par les admins) avec leur niveau d'activité sur 30 jours. */
export default function MembersView() {
  const members = useSupabaseQuery(() => supabase.from('guild_members').select('id, pseudo, guild_role, game_rank').eq('is_active', true), [])
  const activity = useSupabaseQuery(() => supabase.rpc('guild_member_activity', { p_days: 30 }), [])
  const byMember = Object.fromEntries((activity.data || []).map((a) => [a.member_id, a]))

  return (
    <QueryState query={members} empty={<EmptyState title="La liste des membres sera publiée prochainement." />}>
      {(rows) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...rows].sort((a, b) => roleOrder(a.guild_role) - roleOrder(b.guild_role) || a.pseudo.localeCompare(b.pseudo)).map((m) => {
            const act = ACTIVITY[byMember[m.id]?.activity || 'nouveau']
            return (
              <Card key={m.id} data-reveal className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{m.pseudo}</p>
                  <p className="text-sm text-muted">{roleLabel(m.guild_role)}{m.game_rank ? ` · ${m.game_rank}` : ''}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${act.cls}`}>
                  <span className={`h-2 w-2 rounded-full ${act.dot}`} /> {act.label}
                </span>
              </Card>
            )
          })}
        </div>
      )}
    </QueryState>
  )
}
