import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { Card, QueryState, EmptyState } from '@/shared/ui'
import { kindLabel, fmtDateTime } from '@/features/guild/guild'

function EventList({ items, empty }) {
  if (!items.length) return <EmptyState title={empty} />
  return (
    <Card pad="" className="divide-y divide-line">
      {items.map((e) => (
        <div key={e.id} className="px-5 py-4">
          <p className="font-bold">{e.title}</p>
          <p className="text-sm text-muted">{kindLabel(e.kind)} · {fmtDateTime(e.starts_at)}</p>
          {e.notes && <p className="mt-1 text-sm text-muted">{e.notes}</p>}
        </div>
      ))}
    </Card>
  )
}

/** Calendrier public : événements à venir, puis derniers événements passés. */
export default function EventsView() {
  const events = useSupabaseQuery(() => supabase.from('guild_events').select('id, kind, title, starts_at, notes').order('starts_at'), [])
  return (
    <QueryState query={events} isEmpty={() => false}>
      {(rows) => {
        const now = Date.now()
        return (
          <div className="max-w-3xl">
            <h2 data-reveal className="mb-4 font-display text-2xl">À venir</h2>
            <div data-reveal className="mb-12"><EventList items={rows.filter((e) => new Date(e.starts_at) >= now).slice(0, 15)} empty="Aucun événement programmé pour le moment." /></div>
            <h2 data-reveal className="mb-4 font-display text-2xl">Passés</h2>
            <div data-reveal><EventList items={rows.filter((e) => new Date(e.starts_at) < now).reverse().slice(0, 12)} empty="Aucun événement passé." /></div>
          </div>
        )
      }}
    </QueryState>
  )
}
