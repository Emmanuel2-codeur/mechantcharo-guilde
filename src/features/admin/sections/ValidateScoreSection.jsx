import { ClipboardCheck, Clock, RefreshCw, Save, Star } from 'lucide-react'
import { FINAL_PHASES } from '@/features/tournament/phaseLabels'
import { supabase } from '@/shared/lib/supabaseClient'
import { useEffect, useState } from 'react'

/** Saisir et valider le score d’un match terminé. */
function ValidateScoreSection({ matches, onSaved, setError, setMessage }) {
  const [rows, setRows] = useState(matches)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => setRows(matches), [matches])

  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))

  // datetime-local a besoin de l'heure LOCALE, jamais d'UTC (toISOString
  // décale l'heure affichée du fuseau horaire, ce qui fait "sauter" la
  // valeur juste après l'avoir saisie). Si la valeur est déjà au format
  // local (tapée à l'instant), on la garde telle quelle.
  const toDatetimeLocalValue = (v) => {
    if (!v) return ''
    if (typeof v === 'string' && v.length === 16 && !v.includes('Z') && !v.includes('+')) return v
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const toggleFeatured = async (m) => {
    const { error } = await supabase.from('matches').update({ is_featured: !m.is_featured }).eq('id', m.id)
    if (!error) onSaved()
  }

  const validateAller = async (m) => {
    setSavingId(m.id); setError(''); setMessage('')
    const score1 = Number(m.score1)
    const score2 = Number(m.score2)
    const damage1 = Number(m.damage1 || 0)
    const damage2 = Number(m.damage2 || 0)
    if (![score1, score2, damage1, damage2].every(Number.isFinite) || [score1, score2, damage1, damage2].some(v => v < 0)) {
      setError('Les scores et dégâts doivent être des nombres positifs.')
      setSavingId(null)
      return
    }
    const { error } = await supabase.from('matches').update({ score1, score2, damage1, damage2, aller_validated: true }).eq('id', m.id)
    if (error) setError(error.message)
    else { setMessage('Match aller enregistré. Programme puis renseigne le retour pour déterminer le qualifié.'); onSaved() }
    setSavingId(null)
  }

  const scheduleRetour = async (m) => {
    if (!m.scheduled_at_retour) { setError('Choisis une date pour le match retour.'); return }
    setSavingId(m.id); setError(''); setMessage('')
    const { error } = await supabase.from('matches').update({ scheduled_at_retour: new Date(m.scheduled_at_retour).toISOString() }).eq('id', m.id)
    if (error) setError(error.message)
    else { setMessage('Date du match retour enregistrée.'); onSaved() }
    setSavingId(null)
  }

  const validateRetour = async (m) => {
    setSavingId(m.id); setError(''); setMessage('')
    const score1_retour = Number(m.score1_retour || 0)
    const score2_retour = Number(m.score2_retour || 0)
    const damage1_retour = Number(m.damage1_retour || 0)
    const damage2_retour = Number(m.damage2_retour || 0)
    if (![score1_retour, score2_retour, damage1_retour, damage2_retour].every(Number.isFinite) || [score1_retour, score2_retour, damage1_retour, damage2_retour].some(v => v < 0)) {
      setError('Les scores et dégâts du retour doivent être des nombres positifs.')
      setSavingId(null)
      return
    }
    const total1 = Number(m.score1 || 0) + score1_retour
    const total2 = Number(m.score2 || 0) + score2_retour
    const { error } = await supabase.from('matches').update({ score1_retour, score2_retour, damage1_retour, damage2_retour, retour_validated: true }).eq('id', m.id)
    if (error) setError(error.message) // ex : égalité cumulée, refusée automatiquement par la base
    else {
      const winner = total1 > total2 ? m.player1?.pseudo : m.player2?.pseudo
      setMessage(`Retour enregistré (cumul ${total1}-${total2}). ${winner || 'Le vainqueur'} avance vers la prochaine case du bracket.`)
      onSaved()
    }
    setSavingId(null)
  }

  const validatePoule = async (m) => {
    setSavingId(m.id); setError(''); setMessage('')
    const score1 = Number(m.score1)
    const score2 = Number(m.score2)
    const damage1 = Number(m.damage1 || 0)
    const damage2 = Number(m.damage2 || 0)
    if (![score1, score2, damage1, damage2].every(Number.isFinite) || [score1, score2, damage1, damage2].some(v => v < 0)) {
      setError('Les scores et dégâts doivent être des nombres positifs.')
      setSavingId(null)
      return
    }
    const { error } = await supabase.from('matches').update({ score1, score2, damage1, damage2, status: 'completed' }).eq('id', m.id)
    if (error) setError(error.message)
    else { setMessage('Match validé — kills, dégâts et classement mis à jour, match déplacé dans l’Historique.'); onSaved() }
    setSavingId(null)
  }

  const nonCompleted = rows.filter((m) => m.status !== 'completed')

  return (
    <div className="mb-14">
      <div className="flex items-center gap-2.5 mb-1">
        <ClipboardCheck size={18} className="text-charo-orange" />
        <h2 className="font-bold text-lg text-ink">Valider le score du match</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        Score = kills du joueur sur ce match. Une fois validé, le match sort automatiquement des matchs en cours et rejoint l'Historique.
      </p>

      <div className="space-y-4">
        {nonCompleted.length === 0 && <div className="card p-8 text-sm text-muted text-center">Aucun match à valider pour l'instant.</div>}
        {nonCompleted.map((m) => {
          const isFinal = FINAL_PHASES.includes(m.phase)
          const alreadyPlayedAller = m.status === 'aller_completed'
          const total1 = Number(m.score1 || 0) + (isFinal ? Number(m.score1_retour || 0) : 0)
          const total2 = Number(m.score2 || 0) + (isFinal ? Number(m.score2_retour || 0) : 0)
          const statusPill = m.status === 'in_progress'
            ? { text: 'EN COURS', className: 'bg-live/10 text-live border-live/30' }
            : alreadyPlayedAller
              ? { text: 'ALLER TERMINÉ — RETOUR EN ATTENTE', className: 'bg-charo-orange/10 text-charo-orange border-charo-orange/30' }
              : { text: 'PROGRAMMÉ', className: 'bg-surface-soft text-muted border-line' }

          return (
          <div key={m.id} className="card overflow-hidden">
            {/* En-tête : joueurs + statut */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-surface-soft/60 border-b border-line">
              <div>
                <p className="text-sm font-bold text-ink">{m.player1?.pseudo || '—'} <span className="text-muted font-normal">vs</span> {m.player2?.pseudo || '—'}</p>
                <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                  <Clock size={11} /> {m.round_label || m.phase} · {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('fr-FR') : 'sans horaire'}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusPill.className}`}>
                {statusPill.text}
              </span>
            </div>

            {/* Corps : saisie des scores */}
            <div className="p-5">
              {isFinal ? (
                !alreadyPlayedAller ? (
                  <div className="rounded-xl border border-line bg-surface-soft/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-3">Match aller</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <label className="text-[11px] text-muted font-semibold">Kills J1
                        <input type="number" min="0" value={m.score1} onChange={(e) => patch(m.id, { score1: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                      </label>
                      <label className="text-[11px] text-muted font-semibold">Kills J2
                        <input type="number" min="0" value={m.score2} onChange={(e) => patch(m.id, { score2: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                      </label>
                      <label className="text-[11px] text-muted font-semibold">Dégâts J1
                        <input type="number" min="0" value={m.damage1} onChange={(e) => patch(m.id, { damage1: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                      </label>
                      <label className="text-[11px] text-muted font-semibold">Dégâts J2
                        <input type="number" min="0" value={m.damage2} onChange={(e) => patch(m.id, { damage2: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                      </label>
                    </div>
                    <p className="text-[11px] text-muted italic mt-3">Le formulaire du retour (date + score) apparaîtra ici une fois l'aller validé.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-line bg-surface-soft/40 px-4 py-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Aller joué</span>
                      <span className="font-display text-lg text-ink">{m.score1} — {m.score2}</span>
                    </div>

                    <div className="rounded-xl border border-charo-orange/25 bg-charo-orange/[0.04] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-charo-orange mb-3">Match retour</p>

                      <div className="flex flex-wrap items-end gap-2 mb-4">
                        <label className="text-[11px] text-muted font-semibold flex-1 min-w-[200px]">Date &amp; heure du retour
                          <input type="datetime-local" value={toDatetimeLocalValue(m.scheduled_at_retour)} onChange={(e) => patch(m.id, { scheduled_at_retour: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line py-2 px-3 text-sm outline-none focus:border-charo-orange" />
                        </label>
                        <button onClick={() => scheduleRetour(m)} disabled={savingId === m.id} className="rounded-lg border border-charo-orange/40 bg-charo-orange/10 text-charo-orange text-xs font-bold px-3 py-2.5 hover:bg-charo-orange/20 transition-colors disabled:opacity-50 whitespace-nowrap">
                          Enregistrer la date
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <label className="text-[11px] text-muted font-semibold">Kills J1
                          <input type="number" min="0" value={m.score1_retour || 0} onChange={(e) => patch(m.id, { score1_retour: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                        </label>
                        <label className="text-[11px] text-muted font-semibold">Kills J2
                          <input type="number" min="0" value={m.score2_retour || 0} onChange={(e) => patch(m.id, { score2_retour: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                        </label>
                        <label className="text-[11px] text-muted font-semibold">Dégâts J1
                          <input type="number" min="0" value={m.damage1_retour || 0} onChange={(e) => patch(m.id, { damage1_retour: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                        </label>
                        <label className="text-[11px] text-muted font-semibold">Dégâts J2
                          <input type="number" min="0" value={m.damage2_retour || 0} onChange={(e) => patch(m.id, { damage2_retour: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                        </label>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-charo-orange/15">
                        <span className="text-xs text-muted font-semibold">Cumul si validé</span>
                        <span className="font-display text-xl text-charo-orange">{total1} — {total2}</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="text-[11px] text-muted font-semibold">Kills J1
                    <input type="number" min="0" value={m.score1} onChange={(e) => patch(m.id, { score1: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                  </label>
                  <label className="text-[11px] text-muted font-semibold">Kills J2
                    <input type="number" min="0" value={m.score2} onChange={(e) => patch(m.id, { score2: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                  </label>
                  <label className="text-[11px] text-muted font-semibold">Dégâts J1
                    <input type="number" min="0" value={m.damage1} onChange={(e) => patch(m.id, { damage1: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                  </label>
                  <label className="text-[11px] text-muted font-semibold">Dégâts J2
                    <input type="number" min="0" value={m.damage2} onChange={(e) => patch(m.id, { damage2: e.target.value })} className="mt-1 w-full rounded-lg bg-surface border border-line text-center py-2 text-sm font-semibold outline-none focus:border-charo-orange" />
                  </label>
                </div>
              )}
            </div>

            {/* Pied : actions */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line bg-surface-soft/30">
              <button onClick={() => toggleFeatured(m)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${m.is_featured ? 'bg-charo-orange/15 border-charo-orange/40 text-charo-orange' : 'border-line text-muted hover:text-ink'}`}>
                <Star size={13} fill={m.is_featured ? 'currentColor' : 'none'} /> À la une
              </button>

              <button
                onClick={() => (isFinal ? (alreadyPlayedAller ? validateRetour(m) : validateAller(m)) : validatePoule(m))}
                disabled={savingId === m.id}
                className="flex items-center gap-1.5 rounded-lg bg-charo-gradient text-white text-xs font-bold px-4 py-2.5 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {savingId === m.id ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isFinal ? (alreadyPlayedAller ? 'Valider le retour' : 'Valider l\u2019aller') : 'Valider le résultat'}
              </button>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}

export default ValidateScoreSection
