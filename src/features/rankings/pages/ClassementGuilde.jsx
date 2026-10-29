import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { useAuth } from '@/features/auth/AuthContext'
import { useGuildHonor } from '@/features/guild/useGuildHonor'
import { levelProgress, roleLabel } from '@/features/guild/guild'
import { Page, PageHeader, Card, Tabs, EmptyState, QueryState } from '@/shared/ui'

const TABS = [{ value: 'membres', label: 'Membres' }, { value: 'duos', label: 'Duos' }]

function GuildHonorCard({ honor }) {
  const lvl = levelProgress(honor.score)
  return (
    <Card pad="p-8" data-reveal className="mb-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Honneur de la guilde</p>
          <p className="font-display text-5xl text-charo-orange">{honor.level}</p>
        </div>
        <p className="font-display text-4xl">{honor.score} <span className="text-base text-muted">points</span></p>
      </div>
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-ink/10"><div className="h-full bg-charo-gradient" style={{ width: `${lvl.pct}%` }} /></div>
      <p className="mb-6 text-sm text-muted">{lvl.next ? `${lvl.next.min - honor.score} points avant le niveau ${lvl.next.name}` : 'Niveau maximum atteint'}</p>
      <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
        {[['Victoires', honor.wins], ['Défaites', honor.losses], ['Tournois', honor.tournaments], ['Participation', `${honor.participation_pct} %`]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line py-4"><p className="font-display text-3xl">{v}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
    </Card>
  )
}

function MembersBoard() {
  const [mode, setMode] = useState('season')
  const scores = useSupabaseQuery(() => supabase.rpc('member_honor'), [])
  const key = mode === 'season' ? 'season_points' : 'total_points'
  const month = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <section data-reveal className="mb-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl">Honneur des membres</h2>
        <Tabs value={mode} onChange={setMode} items={[{ value: 'season', label: `Ce mois (${month})` }, { value: 'total', label: 'Cumulé' }]} />
      </div>
      <QueryState query={scores} empty={<EmptyState title="Le classement apparaîtra après les premières présences saisies." />}>
        {(rows) => (
          <Card pad="" className="divide-y divide-line">
            {[...rows].sort((a, b) => b[key] - a[key] || a.pseudo.localeCompare(b.pseudo)).map((m, i) => (
              <div key={m.member_id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-4">
                  <span className="w-7 text-center font-display text-xl text-charo-orange">{i + 1}</span>
                  <div><p className="font-semibold">{m.pseudo}</p><p className="text-xs text-muted">{roleLabel(m.guild_role)}</p></div>
                </div>
                <p className="font-display text-2xl">{m[key]}</p>
              </div>
            ))}
          </Card>
        )}
      </QueryState>
    </section>
  )
}

function Awards() {
  const awards = useSupabaseQuery(() => supabase.from('member_badges').select('id, badges(label), guild_members(pseudo)').order('awarded_at', { ascending: false }).limit(30), [])
  if (!awards.data?.length) return null
  return (
    <section data-reveal>
      <h2 className="mb-4 font-display text-3xl">Badges décernés</h2>
      <div className="flex flex-wrap gap-3">
        {awards.data.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm">
            <strong>{a.guild_members?.pseudo}</strong><span className="text-muted">{a.badges?.label}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

function DuosBoard() {
  const duos = useSupabaseQuery(() => supabase.from('guild_duos')
    .select('id, name, points, wins, losses, a:guild_members!member_a(pseudo), b:guild_members!member_b(pseudo)')
    .eq('is_active', true).order('points', { ascending: false }).order('wins', { ascending: false }), [])
  const label = (d) => d.name || `${d.a?.pseudo} & ${d.b?.pseudo}`

  return (
    <section>
      <h2 data-reveal className="mb-2 font-display text-3xl">Classement des duos</h2>
      <p data-reveal className="mb-6 text-muted">Les meilleurs duos de la guilde, mis à jour par les admins.</p>
      <QueryState query={duos} empty={<EmptyState title="Le classement des duos sera publié prochainement." />}>
        {(rows) => (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {rows.slice(0, 3).map((d, i) => (
                <Card key={d.id} data-reveal={i} dark={i === 0} pad="p-6">
                  <p className="mb-2 font-display text-4xl text-charo-orange">#{i + 1}</p>
                  <p className="text-lg font-bold leading-tight">{label(d)}</p>
                  {d.name && <p className={`text-sm ${i === 0 ? 'text-white/60' : 'text-muted'}`}>{d.a?.pseudo} & {d.b?.pseudo}</p>}
                  <p className="mt-4 font-display text-3xl">{d.points} <span className={`font-sans text-sm ${i === 0 ? 'text-white/60' : 'text-muted'}`}>pts · {d.wins}V {d.losses}D</span></p>
                </Card>
              ))}
            </div>
            {rows.length > 3 && (
              <Card pad="" className="divide-y divide-line">
                {rows.slice(3).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-4">
                      <span className="w-7 text-center font-display text-xl text-charo-orange">{i + 4}</span>
                      <div><p className="font-semibold">{label(d)}</p>{d.name && <p className="text-xs text-muted">{d.a?.pseudo} & {d.b?.pseudo}</p>}</div>
                    </div>
                    <p className="text-sm text-muted"><span className="mr-2 font-display text-2xl text-ink">{d.points}</span>{d.wins}V {d.losses}D</p>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </QueryState>
    </section>
  )
}

export default function ClassementGuilde() {
  const ref = useRef(null)
  const [tab, setTab] = useState('membres')
  const honor = useGuildHonor()
  const { isAdmin } = useAuth()
  useReveal(ref, [!!honor, tab])

  return (
    <div ref={ref}>
      <Page size="lg">
        <PageHeader
          eyebrow="Guilde"
          title="Classement"
          lead="Honneur de la guilde, des membres et des duos : tout se gagne à chaque guerre, chaque guilde vs guilde, chaque présence."
          actions={isAdmin && (
            <Link to="/admin?tab=guilde&sub=honneur" className="inline-flex items-center gap-2 rounded-full border border-charo-orange/40 bg-charo-orange/5 px-4 py-2.5 text-sm font-bold text-charo-orange transition-colors hover:bg-charo-orange hover:text-white">
              <ShieldCheck size={15} /> Gérer le classement
            </Link>
          )}
        />
        <Tabs className="mb-10" items={TABS} value={tab} onChange={setTab} />
        {tab === 'membres' ? (
          <>
            {honor && <GuildHonorCard honor={honor} />}
            <MembersBoard />
            <Awards />
          </>
        ) : <DuosBoard />}
      </Page>
    </div>
  )
}
