import { useRef } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { Page, PageHeader, QueryState } from '@/shared/ui'
import { titleIcon } from '@/features/charodor/titles'

const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

/** Charo d'Or : les titres de la guilde, chacun détenu par le joueur désigné par les admins. */
export default function CharoDor() {
  const ref = useRef(null)
  const titles = useSupabaseQuery(() => supabase.from('charo_dor_titles').select('*').order('sort_order'), [])
  const records = useSupabaseQuery(() => supabase.from('charo_dor_records')
    .select('id, title_id, value, season, note, is_current, awarded_at, guild_members(pseudo)')
    .order('awarded_at', { ascending: false }), [])
  useReveal(ref, [titles.loading, records.loading])

  const current = Object.fromEntries((records.data || []).filter((r) => r.is_current).map((r) => [r.title_id, r]))
  const history = (id) => (records.data || []).filter((r) => r.title_id === id && !r.is_current)

  return (
    <div ref={ref}>
      <Page>
        <PageHeader
          eyebrow="Hall of fame"
          title="Charo"
          accent="d’Or"
          lead="Les meilleurs de la guilde, titre par titre. Chaque détenteur est désigné par les admins, et garde sa place jusqu’à ce qu’un autre joueur la prenne."
        />
        <QueryState query={titles} empty={<p className="text-muted">Les titres du Charo d’Or seront publiés prochainement.</p>}>
          {(rows) => (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((t, i) => {
                const Icon = titleIcon(t.code)
                const holder = current[t.id]
                const past = history(t.id)
                const hero = t.code === 'saison'
                return (
                  <article key={t.id} data-reveal={i % 3}
                    className={`relative overflow-hidden rounded-[28px] border p-7 ${hero ? 'border-ink bg-ink text-white md:col-span-2 lg:col-span-3' : 'border-line bg-white'}`}>
                    {hero && <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-charo-orange/30 blur-3xl" />}
                    <div className="relative flex items-start justify-between gap-4">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${hero ? 'bg-charo-gradient text-white' : 'bg-charo-orange/10 text-charo-orange'}`}><Icon size={22} /></span>
                      {holder?.season && <span className={`rounded-full px-3 py-1 text-xs font-bold ${hero ? 'bg-white/10 text-white' : 'bg-surface-soft text-muted'}`}>{holder.season}</span>}
                    </div>
                    <p className={`relative mt-5 text-xs font-bold uppercase tracking-[0.14em] ${hero ? 'text-white/60' : 'text-muted'}`}>{t.label}</p>
                    {holder ? (
                      <>
                        <h2 className={`relative mt-2 font-display ${hero ? 'text-5xl md:text-6xl' : 'text-3xl'}`}>{holder.guild_members?.pseudo}</h2>
                        {holder.value && <p className="relative mt-2 text-xl font-extrabold text-charo-orange">{t.value_hint ? `${t.value_hint} : ` : ''}{holder.value}</p>}
                        {holder.note && <p className={`relative mt-3 text-sm ${hero ? 'text-white/70' : 'text-muted'}`}>{holder.note}</p>}
                        <p className={`relative mt-4 text-xs ${hero ? 'text-white/50' : 'text-muted'}`}>Depuis le {fmtDate(holder.awarded_at)}</p>
                      </>
                    ) : (
                      <>
                        <h2 className={`relative mt-2 font-display ${hero ? 'text-4xl' : 'text-2xl'} ${hero ? 'text-white/40' : 'text-ink/30'}`}>Titre à pourvoir</h2>
                        <p className={`relative mt-2 text-sm ${hero ? 'text-white/60' : 'text-muted'}`}>{t.description}</p>
                      </>
                    )}
                    {past.length > 0 && (
                      <details className="relative mt-5 text-sm">
                        <summary className={`cursor-pointer font-bold ${hero ? 'text-white/80' : 'text-ink'}`}>Anciens détenteurs ({past.length})</summary>
                        <ul className={`mt-2 space-y-1 ${hero ? 'text-white/70' : 'text-muted'}`}>
                          {past.map((r) => <li key={r.id}>{r.guild_members?.pseudo}{r.value ? ` — ${r.value}` : ''}{r.season ? ` (${r.season})` : ''}</li>)}
                        </ul>
                      </details>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </QueryState>
      </Page>
    </div>
  )
}
