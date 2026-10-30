import { Check, Mail, UserPlus, X } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useState } from 'react'

/** Inscriptions en attente : approuver (et placer dans une poule) ou refuser un joueur. */
function PendingSection({ pending, groups, onChanged, setError, setMessage }) {
  const [selectedGroup, setSelectedGroup] = useState({}) // { [playerId]: groupId }

  const approve = async (playerId) => {
    setError(''); setMessage('')
    const groupId = selectedGroup[playerId] || null
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved', group_id: groupId })
      .eq('id', playerId)

    if (error) setError(error.message)
    else {
      setMessage('Joueur validé — il apparaît maintenant dans son groupe et le classement.')
      onChanged()
    }
  }

  const reject = async (playerId) => {
    setError(''); setMessage('')
    const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', playerId)
    if (error) setError(error.message)
    else onChanged()
  }

  return (
    <div className="mb-14">
      <div className="flex items-center gap-2.5 mb-1">
        <UserPlus size={18} className="text-charo-orange" />
        <h2 className="font-bold text-lg text-ink">Accepter les invitations du joueur</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        Choisis un groupe puis valide : le joueur passe direct dans Poules et Classement.
      </p>

      <div className="card divide-y divide-line">
        {pending.length === 0 && <p className="p-6 text-sm text-muted">Aucune inscription en attente.</p>}
        {pending.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-[220px]">
              <p className="font-semibold">{p.pseudo}</p>
              <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <Mail size={11} /> {p.email || '—'} · FF UID {p.ff_uid || '—'}
              </p>
            </div>

            <select
              value={selectedGroup[p.id] ?? ''}
              onChange={(e) => setSelectedGroup((s) => ({ ...s, [p.id]: e.target.value }))}
              className="rounded-lg bg-surface-soft border border-line text-sm px-3 py-2 outline-none focus:border-charo-orange"
            >
              <option value="">Choisir un groupe…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>Groupe {g.name}</option>)}
            </select>

            <div className="flex gap-2 ml-auto">
              <button onClick={() => approve(p.id)} className="w-9 h-9 rounded-lg bg-charo-orange/15 border border-charo-orange/40 text-charo-orange flex items-center justify-center hover:bg-charo-orange hover:text-white transition-colors" aria-label="Approuver">
                <Check size={16} />
              </button>
              <button onClick={() => reject(p.id)} className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors" aria-label="Refuser">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingSection
