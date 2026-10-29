import { useEffect, useState } from 'react'
import { Plus, Award } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { EVENT_KINDS, ATTENDANCE, kindLabel } from '../../lib/guild'

export default function HonorAdmin({ members, run, setError }) {
  const [rules, setRules] = useState([])
  const [rankings, setRankings] = useState({})
  const [badges, setBadges] = useState([])
  const [newBadge, setNewBadge] = useState({ label: '', emoji: '🏅' })
  const [award, setAward] = useState({ member_id: '', badge_id: '' })
  const active = members.filter((m) => m.is_active)

  const load = async () => {
    const [r, k, b] = await Promise.all([
      supabase.from('honor_rules').select('*'),
      supabase.from('member_rankings').select('*'),
      supabase.from('badges').select('*').order('label'),
    ])
    const err = r.error || k.error || b.error
    if (err) { setError(`Honneur : ${err.message} (sql/05_guild_phase3_honor.sql exécuté ?)`); return }
    setRules(r.data || [])
    setRankings(Object.fromEntries((k.data || []).map((x) => [x.member_id, { position: String(x.position), game_rank: x.game_rank || '' }])))
    setBadges(b.data || [])
  }
  useEffect(() => { load() }, [])

  const points = (kind, status) => rules.find((r) => r.kind === kind && r.status === status)
  const setPoints = (kind, status, v) => setRules(rules.map((r) => (r.kind === kind && r.status === status ? { ...r, points: v } : r)))

  const saveRules = () => run(
    supabase.from('honor_rules').upsert(rules.map((r) => ({ id: r.id, kind: r.kind, status: r.status, points: parseInt(r.points, 10) || 0 })), { onConflict: 'kind,status' }),
    'Barème enregistré.'
  )

  const saveRankings = async () => {
    const keep = Object.entries(rankings).filter(([, v]) => parseInt(v.position, 10) > 0)
    const drop = active.map((m) => m.id).filter((id) => !keep.some(([mid]) => mid === id))
    if (drop.length) await supabase.from('member_rankings').delete().in('member_id', drop)
    const rows = keep.map(([member_id, v]) => ({ member_id, position: parseInt(v.position, 10), game_rank: v.game_rank.trim() || null, updated_at: new Date().toISOString() }))
    const ok = rows.length === 0 || await run(supabase.from('member_rankings').upsert(rows, { onConflict: 'member_id' }), 'Classement enregistré.')
    if (ok) load()
  }

  return (
    <div className="space-y-12">
      <section>
        <h3 className="font-bold text-lg mb-1">Barème des points</h3>
        <p className="text-sm text-ink-600 mb-4">Points gagnés (ou perdus) par type d’événement et par statut de présence.</p>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-600"><th className="p-3">Événement</th>{ATTENDANCE.map((a) => <th key={a.value} className="p-3">{a.label}</th>)}</tr></thead>
            <tbody>
              {EVENT_KINDS.map((k) => (
                <tr key={k.value} className="border-t border-ink-700">
                  <td className="p-3 font-semibold">{kindLabel(k.value)}</td>
                  {ATTENDANCE.map((a) => (
                    <td key={a.value} className="p-2">
                      <input type="number" className="input !w-20" value={points(k.value, a.value)?.points ?? 0} onChange={(e) => setPoints(k.value, a.value, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-primary mt-4" onClick={saveRules}>Enregistrer le barème</button>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-1">Classement des membres</h3>
        <p className="text-sm text-ink-600 mb-4">Position saisie à la main. Laisse vide pour retirer un membre du classement.</p>
        <div className="card divide-y divide-ink-700">
          {active.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <span className="font-semibold text-sm">{m.pseudo}</span>
              <div className="flex gap-2">
                <input type="number" min="1" placeholder="Rang" className="input !w-24" value={rankings[m.id]?.position || ''}
                  onChange={(e) => setRankings({ ...rankings, [m.id]: { game_rank: '', ...rankings[m.id], position: e.target.value } })} />
                <input placeholder="Rang en jeu (optionnel)" className="input !w-52" value={rankings[m.id]?.game_rank || ''}
                  onChange={(e) => setRankings({ ...rankings, [m.id]: { position: '', ...rankings[m.id], game_rank: e.target.value } })} />
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={saveRankings}>Enregistrer le classement</button>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award size={18} className="text-charo-orange" /> Badges</h3>
        <button className="btn-outline mb-4" onClick={async () => {
          const { data, error } = await supabase.rpc('award_monthly_mvp')
          if (error) return setError(error.message)
          run(Promise.resolve({ error: null }), data > 0 ? `MVP du mois dernier décerné (${data}).` : 'Aucun MVP : pas de points le mois dernier, ou déjà décerné.')
        }}>Décerner le MVP du mois dernier</button>
        <form className="card p-4 flex flex-wrap gap-3 mb-4" onSubmit={async (e) => {
          e.preventDefault()
          if (!newBadge.label.trim()) return
          if (await run(supabase.from('badges').insert({ label: newBadge.label.trim(), emoji: newBadge.emoji || '🏅' }), 'Badge créé.')) { setNewBadge({ label: '', emoji: '🏅' }); load() }
        }}>
          <input className="input !w-16 text-center" value={newBadge.emoji} onChange={(e) => setNewBadge({ ...newBadge, emoji: e.target.value })} />
          <input className="input flex-1 min-w-[200px]" placeholder="Nom du badge" value={newBadge.label} onChange={(e) => setNewBadge({ ...newBadge, label: e.target.value })} />
          <button className="btn-outline"><Plus size={15} /> Créer</button>
        </form>
        <form className="card p-4 flex flex-wrap gap-3" onSubmit={async (e) => {
          e.preventDefault()
          if (!award.member_id || !award.badge_id) return
          await run(supabase.from('member_badges').insert(award), 'Badge décerné.')
        }}>
          <select className="input flex-1 min-w-[180px]" value={award.member_id} onChange={(e) => setAward({ ...award, member_id: e.target.value })}>
            <option value="">Membre…</option>{active.map((m) => <option key={m.id} value={m.id}>{m.pseudo}</option>)}
          </select>
          <select className="input flex-1 min-w-[180px]" value={award.badge_id} onChange={(e) => setAward({ ...award, badge_id: e.target.value })}>
            <option value="">Badge…</option>{badges.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}
          </select>
          <button className="btn-primary">Décerner</button>
        </form>
      </section>
    </div>
  )
}
