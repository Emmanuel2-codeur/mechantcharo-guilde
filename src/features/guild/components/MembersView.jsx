import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useAccess } from '@/features/auth/useAccess'
import { Avatar, Card, QueryState, EmptyState } from '@/shared/ui'
import { GUILD_ROLES, ACTIVITY, roleLabel } from '@/features/guild/guild'

const roleOrder = (r) => GUILD_ROLES.findIndex((x) => x.value === r)

/** Liste des membres : visible par tous (photo, rôle, rang). Le niveau d'activité n'est montré qu'aux membres. */
export default function MembersView() {
  const { isMember } = useAccess()
  const members = useSupabaseQuery(() => supabase.from('guild_members').select('id, pseudo, guild_role, game_rank, avatar_url').eq('is_active', true), [])
  const activity = useSupabaseQuery(() => supabase.rpc('guild_member_activity', { p_days: 30 }), [], { enabled: isMember })
  const byMember = Object.fromEntries((activity.data || []).map((a) => [a.member_id, a]))

  return (
    <QueryState query={members} empty={<EmptyState title="La liste des membres sera publiée prochainement." />}>
      {(rows) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...rows].sort((a, b) => roleOrder(a.guild_role) - roleOrder(b.guild_role) || a.pseudo.localeCompare(b.pseudo)).map((m) => {
            const act = isMember ? ACTIVITY[byMember[m.id]?.activity || 'nouveau'] : null
            return (
              <Card key={m.id} to={`/membre/${m.id}`} data-reveal className="flex items-center gap-4">
                <Avatar src={m.avatar_url} name={m.pseudo} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{m.pseudo}</p>
                  <p className="truncate text-sm text-muted">{roleLabel(m.guild_role)}{m.game_rank ? ` · ${m.game_rank}` : ''}</p>
                </div>
                {act && (
                  <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${act.cls}`}>
                    <span className={`h-2 w-2 rounded-full ${act.dot}`} /> {act.label}
                  </span>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </QueryState>
  )
}
