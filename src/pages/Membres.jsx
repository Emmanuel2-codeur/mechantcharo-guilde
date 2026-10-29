import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useReveal } from '../lib/useGsapEffects'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'
import { GUILD_ROLES, ACTIVITY, roleLabel } from '../lib/guild'

export default function Membres() {
  const pageRef = useRef(null)
  const [members, setMembers] = useState([])
  const [activity, setActivity] = useState({})
  const [loading, setLoading] = useState(true)
  useReveal(pageRef, [loading])

  useEffect(() => {
    Promise.all([
      supabase.from('guild_members').select('id, pseudo, guild_role, joined_at').eq('is_active', true),
      supabase.rpc('guild_member_activity', { p_days: 30 }),
    ]).then(([m, a]) => {
      setMembers(m.data || [])
      setActivity(Object.fromEntries((a.data || []).map((r) => [r.member_id, r])))
      setLoading(false)
    })
  }, [])

  const order = (r) => GUILD_ROLES.findIndex((x) => x.value === r)
  const sorted = [...members].sort((a, b) => order(a.guild_role) - order(b.guild_role) || a.pseudo.localeCompare(b.pseudo))

  return (
    <div className="min-h-screen" ref={pageRef}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <span data-reveal className="eyebrow mb-4">La famille</span>
        <h1 data-reveal className="font-display text-5xl md:text-6xl text-ink-950 mb-3">Membres</h1>
        <p data-reveal className="text-ink-600 max-w-xl mb-10">
          Les joueurs acceptés par les admins forment la guilde. L’activité reflète leur participation aux guerres et événements sur les 30 derniers jours.
        </p>
        {loading ? <p className="text-ink-600">Chargement…</p> : sorted.length === 0 ? (
          <p className="text-ink-600">La liste des membres sera publiée prochainement.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((m) => {
              const act = ACTIVITY[activity[m.id]?.activity || 'nouveau']
              return (
                <div key={m.id} data-reveal className="card p-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">{m.pseudo}</p>
                    <p className="text-sm text-ink-600">{roleLabel(m.guild_role)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${act.cls}`}>
                    <span className={`w-2 h-2 rounded-full ${act.dot}`} /> {act.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
