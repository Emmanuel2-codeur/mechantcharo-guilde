import { useRef } from 'react'
import { Trophy, Swords, Award, History } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useReveal, useCountUp } from '@/shared/hooks/useGsapEffects'
import { Page, PageHeader, Card, EmptyState, QueryState } from '@/shared/ui'

const fmt = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null)

/** Page publique : classement de la guilde (actuel et passé), guildes vaincues en GVG, distinctions. */
export default function Realisations() {
  const ref = useRef(null)
  const ranks = useSupabaseQuery(() => supabase.from('guild_rank_history').select('*').order('is_current', { ascending: false }).order('started_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }), [])
  const items = useSupabaseQuery(() => supabase.from('guild_achievements').select('*').order('achieved_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }), [])
  useReveal(ref, [ranks.loading, items.loading])
  useCountUp(ref, [ranks.loading, items.loading])

  const current = (ranks.data || []).find((r) => r.is_current)
  const past = (ranks.data || []).filter((r) => !r.is_current)
  const wins = (items.data || []).filter((a) => a.kind === 'gvg_win')
  const honors = (items.data || []).filter((a) => a.kind !== 'gvg_win')

  return (
    <div ref={ref}>
      <Page>
        <PageHeader eyebrow="Palmarès" title="Nos" accent="réalisations" lead="Le classement de la guilde, les guildes que nous avons vaincues en GVG et les distinctions obtenues au fil des saisons." />

        {/* Classement actuel */}
        <section data-reveal className="relative mb-12 overflow-hidden rounded-[32px] bg-ink p-8 text-white md:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-charo-orange/30 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Classement actuel de la guilde</p>
              {current ? (
                <>
                  <p className="font-display text-7xl leading-none md:text-9xl">N°<span data-count={current.rank}>0</span></p>
                  <p className="mt-3 text-2xl font-bold text-charo-orange">au classement {current.scope === 'Togo' ? 'du Togo' : current.scope}</p>
                  {current.note && <p className="mt-3 max-w-lg text-white/70">{current.note}</p>}
                  {current.started_on && <p className="mt-2 text-sm text-white/50">Depuis le {fmt(current.started_on)}</p>}
                </>
              ) : <p className="font-display text-3xl text-white/50">Classement bientôt communiqué.</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-2xl bg-white/10 px-6 py-5"><p className="font-display text-4xl"><span data-count={wins.length}>0</span></p><p className="text-xs text-white/60">guildes vaincues</p></div>
              <div className="rounded-2xl bg-white/10 px-6 py-5"><p className="font-display text-4xl"><span data-count={honors.length}>0</span></p><p className="text-xs text-white/60">distinctions</p></div>
            </div>
          </div>
        </section>

        {/* Victoires GVG */}
        <section className="mb-12">
          <h2 data-reveal className="mb-6 flex items-center gap-3 font-display text-3xl"><Swords className="text-charo-orange" size={26} /> Guildes vaincues en GVG</h2>
          <QueryState query={items} isEmpty={() => wins.length === 0} empty={<EmptyState title="Les victoires en guilde vs guilde seront listées ici." />}>
            {() => (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wins.map((w, i) => (
                  <Card key={w.id} data-reveal={i % 3} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{w.title}</p>
                      <p className="text-sm text-muted">{[w.detail, fmt(w.achieved_on)].filter(Boolean).join(' · ') || 'Victoire'}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-charo-orange/10 text-charo-orange"><Trophy size={18} /></span>
                  </Card>
                ))}
              </div>
            )}
          </QueryState>
        </section>

        {/* Distinctions */}
        {honors.length > 0 && (
          <section className="mb-12">
            <h2 data-reveal className="mb-6 flex items-center gap-3 font-display text-3xl"><Award className="text-charo-orange" size={26} /> Distinctions et palmarès</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {honors.map((h, i) => (
                <Card key={h.id} data-reveal={i % 2}>
                  <p className="text-lg font-bold">{h.title}</p>
                  <p className="text-sm text-muted">{[h.detail, fmt(h.achieved_on)].filter(Boolean).join(' · ')}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Classements passés */}
        <section>
          <h2 data-reveal className="mb-6 flex items-center gap-3 font-display text-3xl"><History className="text-charo-orange" size={26} /> Classements passés</h2>
          {past.length === 0 ? <EmptyState title="L'historique du classement de la guilde apparaîtra ici." /> : (
            <Card pad="" data-reveal className="divide-y divide-line">
              {past.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-display text-2xl text-charo-orange">N°{r.rank}</span>
                    <div>
                      <p className="font-semibold">{r.scope === 'Togo' ? 'Classement du Togo' : r.scope}</p>
                      <p className="text-xs text-muted">{r.period_label || [fmt(r.started_on), fmt(r.ended_on)].filter(Boolean).join(' → ')}</p>
                    </div>
                  </div>
                  {r.note && <p className="hidden max-w-xs text-right text-sm text-muted md:block">{r.note}</p>}
                </div>
              ))}
            </Card>
          )}
        </section>
      </Page>
    </div>
  )
}
