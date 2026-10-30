import { Pencil, Save, Trash2, Trophy, X } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useState } from 'react'

/** Joueurs approuvés : changer de poule, retirer un joueur. */
function PlayerManagementSection({ players, groups, onChanged, setError, setMessage }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const save = async (player) => {
    setSaving(true); setError(''); setMessage('')
    const { error } = await supabase.from('profiles').update({
      pseudo: player.pseudo.trim(),
      ff_uid: player.ff_uid?.trim() || '',
      group_id: player.group_id || null,
    }).eq('id', player.id)
    if (error) setError(error.message)
    else { setMessage(`Joueur ${player.pseudo} modifié.`); setEditing(null); onChanged() }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!window.confirm('Supprimer définitivement ce joueur et son compte ? Cette action est irréversible.')) return
    setError(''); setMessage('')
    const { error } = await supabase.rpc('admin_delete_player', { p_player_id: id })
    if (error) setError(error.message)
    else { setMessage('Joueur supprimé.'); onChanged() }
  }

  return (
    <div className="mb-14">
      <div className="flex items-center gap-2.5 mb-1"><Trophy size={18} className="text-charo-orange" /><h2 className="font-bold text-lg text-ink">Joueurs approuvés / classement</h2></div>
      <p className="text-sm text-muted mb-5">Modifie les informations d’un joueur qui alimentent le classement, ou supprime son inscription.</p>
      <div className="card divide-y divide-line overflow-hidden">
        {players.length === 0 && <p className="p-6 text-sm text-muted">Aucun joueur approuvé.</p>}
        {players.map((p) => {
          const row = editing?.id === p.id ? editing : p
          return (
            <div key={p.id} className="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[180px] flex-1">
                  {editing?.id === p.id ? (
                    <input value={row.pseudo} onChange={(e) => setEditing({ ...row, pseudo: e.target.value })} className="w-full rounded-lg bg-white border border-line text-sm px-3 py-2" />
                  ) : <p className="font-semibold">{p.pseudo}</p>}
                  <p className="text-xs text-muted mt-1">{p.wins} V · {p.losses} D · {p.total_kills || 0} kills · {(p.total_damage || 0).toLocaleString('fr-FR')} dégâts · {p.total_points || 0} pts</p>
                </div>
                {editing?.id === p.id ? (
                  <>
                    <input value={row.ff_uid || ''} onChange={(e) => setEditing({ ...row, ff_uid: e.target.value })} placeholder="ID Free Fire" className="rounded-lg bg-white border border-line text-sm px-3 py-2" />
                    <select value={row.group_id || ''} onChange={(e) => setEditing({ ...row, group_id: e.target.value })} className="rounded-lg bg-white border border-line text-sm px-3 py-2">
                      <option value="">Sans groupe</option>{groups.map(g => <option key={g.id} value={g.id}>Groupe {g.name}</option>)}
                    </select>
                    <button onClick={() => save(row)} disabled={saving} className="w-9 h-9 rounded-lg bg-charo-orange text-white flex items-center justify-center"><Save size={15} /></button>
                    <button onClick={() => setEditing(null)} className="w-9 h-9 rounded-lg border border-line text-muted flex items-center justify-center"><X size={15} /></button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold px-3 py-2 rounded-lg bg-surface-soft">Groupe {groups.find(g => g.id === p.group_id)?.name || '—'}</span>
                    <button onClick={() => setEditing({ ...p })} className="w-9 h-9 rounded-lg border border-line text-muted flex items-center justify-center hover:bg-surface-soft" aria-label="Modifier"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="w-9 h-9 rounded-lg border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white" aria-label="Supprimer"><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================================
   Les qualifications de la phase finale sont désormais gérées dans l’onglet
   « Joueurs qualifiés » : sélection manuelle de 32 joueurs, sans tirage.
   ============================================================================ */

export default PlayerManagementSection
