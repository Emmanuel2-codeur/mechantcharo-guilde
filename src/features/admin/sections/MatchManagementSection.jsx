import { Pencil, Save, Trash2, X } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useState } from 'react'
import { PHASES } from '@/features/admin/sections/matchConstants'

/** Modifier, reprogrammer ou supprimer les matchs existants. */
function MatchManagementSection({ matches, players, groups, onChanged, setError, setMessage }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const save = async (m) => {
    if (m.player1_id && m.player1_id === m.player2_id) { setError('Les deux joueurs doivent être différents.'); return }
    setSaving(true); setError(''); setMessage('')
    const { error } = await supabase.from('matches').update({
      player1_id: m.player1_id || null, player2_id: m.player2_id || null,
      phase: m.phase, group_id: m.phase === 'poule' ? (m.group_id || null) : null,
      leg: m.phase === 'poule' ? null : (m.leg || 'aller'),
      match_type: m.match_type, scheduled_at: m.scheduled_at || null,
      bracket_position: m.bracket_position || null,
      round_label: m.round_label || null,
      score1: Number(m.score1 || 0), score2: Number(m.score2 || 0),
      damage1: Number(m.damage1 || 0), damage2: Number(m.damage2 || 0),
      winner_id: m.winner_id || null,
      status: m.status, status_override: !!m.status_override, is_featured: !!m.is_featured,
    }).eq('id', m.id)
    if (error) setError(error.message)
    else { setMessage('Match modifié et statistiques recalculées si nécessaire.'); setEditing(null); onChanged() }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!window.confirm('Supprimer ce match ? Les statistiques seront recalculées.')) return
    const { error } = await supabase.from('matches').delete().eq('id', id)
    if (error) setError(error.message)
    else { setMessage('Match supprimé et statistiques recalculées.'); onChanged() }
  }

  return (
    <div className="mb-14">
      <div className="flex items-center gap-2.5 mb-1"><Pencil size={18} className="text-charo-orange" /><h2 className="font-bold text-lg text-ink">Gestion des matchs</h2></div>
      <p className="text-sm text-muted mb-5">Chaque match enregistré peut être modifié ou supprimé. Une modification de score/dégâts recalcule le classement.</p>
      <div className="card divide-y divide-line overflow-hidden">
        {matches.map((m) => {
          const row = editing?.id === m.id ? editing : m
          return <div key={m.id} className="p-5">
            {editing?.id === m.id ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                <select value={row.player1_id || ''} onChange={e => setEditing({ ...row, player1_id: e.target.value })} className="rounded-lg bg-white border border-line text-sm px-3 py-2"><option value="">Joueur 1</option>{players.map(p => <option key={p.id} value={p.id}>{p.pseudo}</option>)}</select>
                <select value={row.player2_id || ''} onChange={e => setEditing({ ...row, player2_id: e.target.value })} className="rounded-lg bg-white border border-line text-sm px-3 py-2"><option value="">Joueur 2</option>{players.map(p => <option key={p.id} value={p.id}>{p.pseudo}</option>)}</select>
                <select value={row.phase} onChange={e => setEditing({ ...row, phase: e.target.value })} className="rounded-lg bg-white border border-line text-sm px-3 py-2">{PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                <select value={row.status} onChange={e => setEditing({ ...row, status: e.target.value, status_override: true })} className="rounded-lg bg-white border border-line text-sm px-3 py-2"><option value="scheduled">Programmé</option><option value="in_progress">En cours</option><option value="completed">Terminé</option></select>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <input type="checkbox" checked={!!row.status_override} onChange={e => setEditing({ ...row, status_override: e.target.checked })} />
                  Contrôle manuel du statut
                </label>
                <input type="number" min="0" value={row.score1 ?? 0} onChange={e => setEditing({ ...row, score1: e.target.value })} placeholder="Kills J1" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                <input type="number" min="0" value={row.score2 ?? 0} onChange={e => setEditing({ ...row, score2: e.target.value })} placeholder="Kills J2" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                <input type="number" min="0" value={row.damage1 ?? 0} onChange={e => setEditing({ ...row, damage1: e.target.value })} placeholder="Dégâts J1" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                <input type="number" min="0" value={row.damage2 ?? 0} onChange={e => setEditing({ ...row, damage2: e.target.value })} placeholder="Dégâts J2" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                <input value={row.round_label || ''} onChange={e => setEditing({ ...row, round_label: e.target.value })} placeholder="Libellé du tour" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!row.is_featured} onChange={e => setEditing({ ...row, is_featured: e.target.checked })} /> À la une</label>
                <div className="flex gap-2"><button onClick={() => save(row)} disabled={saving} className="w-9 h-9 rounded-lg bg-charo-orange text-white flex items-center justify-center"><Save size={15} /></button><button onClick={() => setEditing(null)} className="w-9 h-9 rounded-lg border border-line text-muted flex items-center justify-center"><X size={15} /></button></div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[220px] flex-1"><p className="font-semibold">{m.player1?.pseudo || '—'} <span className="text-muted">vs</span> {m.player2?.pseudo || '—'}</p><p className="text-xs text-muted mt-1">{m.round_label || m.phase} · {m.status} · {m.score1}-{m.score2} kills · {m.damage1}-{m.damage2} dégâts</p></div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-surface-soft">{m.phase}</span>
                <button onClick={() => setEditing({ ...m })} className="w-9 h-9 rounded-lg border border-line text-muted flex items-center justify-center hover:bg-surface-soft"><Pencil size={15} /></button>
                <button onClick={() => remove(m.id)} className="w-9 h-9 rounded-lg border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
        })}
      </div>
    </div>
  )
}

export default MatchManagementSection
