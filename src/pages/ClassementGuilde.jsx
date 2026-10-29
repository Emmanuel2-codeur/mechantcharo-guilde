import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useReveal } from '../lib/useGsapEffects'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'
import { useGuildHonor } from '../lib/useGuildHonor'
import { levelProgress, roleLabel } from '../lib/guild'
import { useAuth } from '../lib/AuthContext'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export default function ClassementGuilde() {
  const pageRef = useRef(null)
  const honor = useGuildHonor()
  const [mode, setMode] = useState('season')
  const [scores, setScores] = useState([])
  const [rankings, setRankings] = useState([])
  const [awards, setAwards] = useState([])
  const [duos, setDuos] = useState([])
  const [tab, setTab] = useState('membres')
  const { isAdmin } = useAuth()
  useReveal(pageRef, [!!honor, scores.length, rankings.length, awards.length, duos.length, tab])

  useEffect(() => {
    supabase.rpc('member_honor').then(({ data }) => setScores(data || []))
    supabase.from('member_rankings').select('position, game_rank, guild_members(pseudo)').order('position').then(({ data }) => setRankings(data || []))
    supabase.from('guild_duos')
      .select('id, name, points, wins, losses, a:guild_members!member_a(pseudo), b:guild_members!member_b(pseudo)')
      .eq('is_active', true).order('points', { ascending: false }).order('wins', { ascending: false })
      .then(({ data }) => setDuos(data || []))
    supabase.from('member_badges').select('id, badges(label, emoji), guild_members(pseudo)').order('awarded_at', { ascending: false }).limit(30).then(({ data }) => setAwards(data || []))
  }, [])

  const key = mode === 'season' ? 'season_points' : 'total_points'
  const board = [...scores].sort((a, b) => b[key] - a[key] || a.pseudo.localeCompare(b.pseudo))
  const lvl = honor ? levelProgress(honor.score) : null
  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen" ref={pageRef}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <span data-reveal className="eyebrow mb-4">Guilde</span>
        <h1 data-reveal className="font-display text-5xl md:text-6xl text-ink-950 mb-3">Classement</h1>
        <p data-reveal className="text-ink-600 max-w-xl mb-10">Honneur de la guilde, des membres et des duos : tout se gagne à chaque guerre, chaque guilde vs guilde, chaque présence.</p>
        <div className="flex flex-wrap items-center gap-2 mb-10" data-reveal>
          {[['membres', 'Membres'], ['duos', 'Duos']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${tab === v ? 'border-ink-950 bg-ink-950 text-white' : 'border-ink-700 bg-white text-ink-600 hover:border-ink-950'}`}>{l}</button>
          ))}
          {isAdmin && (
            <Link to="/admin?tab=guilde" className="ml-auto inline-flex items-center gap-2 rounded-full border border-charo-orange/40 bg-charo-orange/5 px-4 py-2.5 text-sm font-bold text-charo-orange hover:bg-charo-orange hover:text-white transition-colors">
              <ShieldCheck size={15} /> Gérer le classement
            </Link>
          )}
        </div>


        {tab === 'membres' && (<>
        {honor && lvl && (
          <section data-reveal className="card p-8 mb-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div>
                <p className="text-sm text-ink-600">Honneur de la guilde</p>
                <p className="font-display text-5xl text-charo-orange">{honor.level}</p>
              </div>
              <p className="font-display text-4xl text-ink-950">{honor.score} <span className="text-base text-ink-600">points</span></p>
            </div>
            <div className="h-3 rounded-full bg-ink-950/10 overflow-hidden mb-2">
              <div className="h-full bg-charo-gradient" style={{ width: `${lvl.pct}%` }} />
            </div>
            <p className="text-sm text-ink-600 mb-6">{lvl.next ? `${lvl.next.min - honor.score} points avant le niveau ${lvl.next.name}` : 'Niveau maximum atteint'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[['Victoires', honor.wins], ['Défaites', honor.losses], ['Tournois', honor.tournaments], ['Participation', `${honor.participation_pct} %`]].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-ink-700 py-4"><p className="font-display text-3xl">{v}</p><p className="text-xs text-ink-600">{l}</p></div>
              ))}
            </div>
          </section>
        )}

        <section data-reveal className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-3xl text-ink-950">Honneur des membres</h2>
            <div className="flex gap-2">
              {[['season', `Ce mois (${monthName})`], ['total', 'Cumulé']].map(([v, l]) => (
                <button key={v} onClick={() => setMode(v)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${mode === v ? 'border-charo-orange text-charo-orange bg-charo-orange/5' : 'border-ink-700 text-ink-600 bg-white'}`}>{l}</button>
              ))}
            </div>
          </div>
          {board.length === 0 ? <p className="text-ink-600">Le classement apparaîtra après les premières présences saisies.</p> : (
            <div className="card divide-y divide-ink-700">
              {board.map((m, i) => (
                <div key={m.member_id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-4">
                    <span className="w-7 text-center font-display text-xl text-charo-orange">{i + 1}</span>
                    <div><p className="font-semibold">{m.pseudo}</p><p className="text-xs text-ink-600">{roleLabel(m.guild_role)}</p></div>
                  </div>
                  <p className="font-display text-2xl">{m[key]}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {rankings.length > 0 && (
          <section data-reveal className="mb-12">
            <h2 className="font-display text-3xl text-ink-950 mb-4">Classement des membres</h2>
            <div className="card divide-y divide-ink-700">
              {rankings.map((r) => (
                <div key={r.position} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-4"><span className="w-7 text-center font-display text-xl text-charo-orange">{r.position}</span><span className="font-semibold">{r.guild_members?.pseudo}</span></div>
                  {r.game_rank && <span className="text-sm text-ink-600">{r.game_rank}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {awards.length > 0 && (
          <section data-reveal>
            <h2 className="font-display text-3xl text-ink-950 mb-4">Badges décernés</h2>
            <div className="flex flex-wrap gap-3">
              {awards.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-white px-4 py-2 text-sm">
                  <span>{a.badges?.emoji}</span><strong>{a.guild_members?.pseudo}</strong><span className="text-ink-600">{a.badges?.label}</span>
                </span>
              ))}
            </div>
          </section>
        )}
        </>)}

        {tab === 'duos' && (
          <section data-reveal>
            <h2 className="font-display text-3xl text-ink-950 mb-2">Classement des duos</h2>
            <p className="text-ink-600 mb-6">Les meilleurs duos de la guilde, mis à jour par les admins.</p>
            {duos.length === 0 ? <p className="text-ink-600">Le classement des duos sera publié prochainement.</p> : (
              <>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {duos.slice(0, 3).map((d, i) => (
                    <div key={d.id} data-reveal={i} className={`card p-6 ${i === 0 ? 'bg-ink-950 text-white border-ink-950' : ''}`}>
                      <p className={`font-display text-4xl mb-2 ${i === 0 ? 'text-charo-orange' : 'text-charo-orange'}`}>#{i + 1}</p>
                      <p className="font-bold text-lg leading-tight">{d.name || `${d.a?.pseudo} & ${d.b?.pseudo}`}</p>
                      {d.name && <p className={`text-sm ${i === 0 ? 'text-white/60' : 'text-ink-600'}`}>{d.a?.pseudo} & {d.b?.pseudo}</p>}
                      <p className="mt-4 font-display text-3xl">{d.points} <span className={`text-sm font-sans ${i === 0 ? 'text-white/60' : 'text-ink-600'}`}>pts · {d.wins}V {d.losses}D</span></p>
                    </div>
                  ))}
                </div>
                {duos.length > 3 && (
                  <div className="card divide-y divide-ink-700">
                    {duos.slice(3).map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-4">
                          <span className="w-7 text-center font-display text-xl text-charo-orange">{i + 4}</span>
                          <div><p className="font-semibold">{d.name || `${d.a?.pseudo} & ${d.b?.pseudo}`}</p>{d.name && <p className="text-xs text-ink-600">{d.a?.pseudo} & {d.b?.pseudo}</p>}</div>
                        </div>
                        <p className="text-sm text-ink-600"><span className="font-display text-2xl text-ink-950 mr-2">{d.points}</span>{d.wins}V {d.losses}D</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
