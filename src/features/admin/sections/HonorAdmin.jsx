import { useEffect, useState } from 'react'
import { Plus, Award } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { EVENT_KINDS, ATTENDANCE, kindLabel } from '@/features/guild/guild'

export default function HonorAdmin({ members, run, setError }) {
  const [rules, setRules] = useState([])
  const [badges, setBadges] = useState([])
  const [newBadge, setNewBadge] = useState({ label: '', emoji: '🏅' })
  const [award, setAward] = useState({ member_id: '', badge_id: '' })
  const active = members.filter((m) => m.is_active)

  const load = async () => {
    const [r, b] = await Promise.all([
      supabase.from('honor_rules').select('*'),
      supabase.from('badges').select('*').order('label'),
    ])
    const err = r.error || b.error
    if (err) { setError(`Honneur : ${err.message} (sql/05_guild_phase3_honor.sql exécuté ?)`); return }
    setRules(r.data || [])
    setBadges(b.data || [])
  }
  useEffect(() => { load() }, [])

  const points = (kind, status) => rules.find((r) => r.kind === kind && r.status === status)
  const setPoints = (kind, status, v) => setRules(rules.map((r) => (r.kind === kind && r.status === status ? { ...r, points: v } : r)))

  const saveRules = () => run(
    supabase.from('honor_rules').upsert(rules.map((r) => ({ id: r.id, kind: r.kind, status: r.status, points: parseInt(r.points, 10) || 0 })), { onConflict: 'kind,status' }),
    'Barème enregistré.'
  )

  return (
    <div className="space-y-12">
      <section>
        <h3 className="font-bold text-lg mb-1">Barème des points</h3>
        <p className="text-sm text-muted mb-4">Points gagnés (ou perdus) par type d’événement et par statut de présence.</p>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="p-3">Événement</th>{ATTENDANCE.map((a) => <th key={a.value} className="p-3">{a.label}</th>)}</tr></thead>
            <tbody>
              {EVENT_KINDS.map((k) => (
                <tr key={k.value} className="border-t border-line">
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
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award size={18} className="text-charo-orange" /> Badges</h3>
        <button className="btn-outline mb-4" onClick={async () => {
          const { data, error } = await supabase.rpc('award_monthly_mvp')
          if (error) return setError(error.message)
          run(Promise.resolve({ error: null }), data > 0 ? `MVP du mois dernier décerné (${data}).` : 'Aucun MVP : pas de points le mois dernier, ou déjà décerné.')
        }}>Décerner le MVP du mois dernier</button>
        <form className="card p-4 flex flex-wrap gap-3 mb-4" onSubmit={async (e) => {
          e.preventDefault()
          if (!newBadge.label.trim()) return
          const { error } = await supabase.from('badges').insert({ label: newBadge.label.trim(), emoji: newBadge.emoji || '🏅' })
          if (error) { setError(error.code === '23505' ? 'Un badge porte déjà ce nom.' : error.message); return }
          setNewBadge({ label: '', emoji: '🏅' }); run(Promise.resolve({ error: null }), 'Badge créé.'); load()
        }}>
          <input className="input !w-16 text-center" value={newBadge.emoji} onChange={(e) => setNewBadge({ ...newBadge, emoji: e.target.value })} />
          <input className="input flex-1 min-w-[200px]" placeholder="Nom du badge" value={newBadge.label} onChange={(e) => setNewBadge({ ...newBadge, label: e.target.value })} />
          <button className="btn-outline"><Plus size={15} /> Créer</button>
        </form>
        <form className="card p-4 flex flex-wrap gap-3" onSubmit={async (e) => {
          e.preventDefault()
          if (!award.member_id || !award.badge_id) return
          const { error } = await supabase.from('member_badges').insert(award)
          if (error) {
            setError(error.code === '23505'
              ? 'Ce badge a déjà été décerné à ce membre pour la même période. Exécute sql/guild/09_access_control.sql pour autoriser plusieurs attributions.'
              : error.message)
            return
          }
          run(Promise.resolve({ error: null }), 'Badge décerné.')
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
