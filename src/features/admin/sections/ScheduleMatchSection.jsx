import { CalendarPlus } from 'lucide-react'
import { FINAL_PHASES, FINAL_PHASE_COUNTS } from '@/features/tournament/phaseLabels'
import PlayerCombobox from '@/features/admin/components/PlayerCombobox'
import { supabase } from '@/shared/lib/supabaseClient'
import { useState } from 'react'
import { MATCH_TYPES, PHASES } from '@/features/admin/sections/matchConstants'

const LAST_MATCH_SETTINGS_KEY = 'charos_admin_last_match_settings'

function loadLastMatchSettings() {
  try {
    const raw = localStorage.getItem(LAST_MATCH_SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}


/** Programmer un match (joueurs, phase, date, type). */
function ScheduleMatchSection({ players, groups, matches = [], onCreated, setError, setMessage }) {
  const remembered = loadLastMatchSettings()
  const [form, setForm] = useState({
    player1_id: '', player2_id: '', scheduled_at: '',
    match_type: remembered?.match_type || 'onetap',
    leg: remembered?.leg || 'aller',
    phase: remembered?.phase || 'poule',
    group_id: '',
    group_auto: true, // le groupe suit automatiquement le joueur 1 tant que l'admin n'a rien choisi lui-même
  })
  const [saving, setSaving] = useState(false)
  const [rememberHour, setRememberHour] = useState(remembered?.hour || '')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Détection automatique de la poule dès que le joueur 1 est choisi
  const setPlayer1 = (id) => {
    const player = players.find((p) => p.id === id)
    set({
      player1_id: id,
      group_id: form.group_auto && player?.group_id ? player.group_id : form.group_id,
    })
  }

  // Pré-remplit l'heure avec la dernière utilisée, à la date choisie
  const applyRememberedHour = (dateOnly) => {
    if (!dateOnly || !rememberHour) return dateOnly
    return `${dateOnly.slice(0, 10)}T${rememberHour}`
  }

  const onDateChange = (raw) => {
    if (raw && raw.length === 10) { // l'utilisateur n'a saisi que la date (widget natif) -> on complète l'heure mémorisée
      set({ scheduled_at: applyRememberedHour(raw) || raw })
    } else {
      set({ scheduled_at: raw })
      if (raw?.length >= 16) setRememberHour(raw.slice(11, 16))
    }
  }

  const createMatch = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')

    if (!form.player1_id || !form.player2_id) { setError('Choisis les deux joueurs.'); return }
    if (form.player1_id === form.player2_id) { setError('Les deux joueurs doivent être différents.'); return }

    setSaving(true)

    // Les matchs de la phase finale ont toujours une case de bracket explicite.
    // Ainsi, une programmation depuis l'onglet « Matchs » arrive elle aussi
    // directement dans 16èmes / Quarts / Demies / Finale.
    const isFinalPhase = FINAL_PHASES.includes(form.phase)
    let bracket_position = null
    let round_label = null

    if (isFinalPhase) {
      const counts = FINAL_PHASE_COUNTS
      const used = new Set(matches.filter(m => m.phase === form.phase).map(m => Number(m.bracket_position || 0)))
      bracket_position = Array.from({ length: counts[form.phase] }, (_, i) => i + 1).find(pos => !used.has(pos))
      if (!bracket_position) {
        setError(`Toutes les cases de ${PHASES.find(p => p.value === form.phase)?.label || form.phase} sont déjà occupées.`)
        setSaving(false)
        return
      }
      round_label = `${PHASES.find(p => p.value === form.phase)?.label || form.phase} ${bracket_position}`
    }

    const { data: createdMatch, error } = await supabase.from('matches').insert({
      player1_id: form.player1_id,
      player2_id: form.player2_id,
      scheduled_at: form.scheduled_at || null,
      match_type: form.match_type,
      leg: form.phase === 'poule' ? null : form.leg,
      phase: form.phase,
      group_id: form.phase === 'poule' ? (form.group_id || null) : null,
      status: 'scheduled',
      status_override: false,
      bracket_position,
      round_label,
    }).select('id').single()

    if (error) setError(error.message)
    else {
      if (isFinalPhase && createdMatch?.id && form.phase !== 'trente_deuxieme') {
        await supabase.rpc('sync_final_bracket_match_players', { p_match_id: createdMatch.id })
      }
      setMessage(isFinalPhase
        ? `Match programmé dans ${round_label}. Il est maintenant visible dans le tableau de la phase finale pour modification et validation du score.`
        : 'Match programmé. Il passera en cours tout seul à l’heure prévue.')
      // On mémorise les réglages (hors joueurs et date) pour préremplir le prochain match
      const hour = form.scheduled_at?.length >= 16 ? form.scheduled_at.slice(11, 16) : rememberHour
      localStorage.setItem(LAST_MATCH_SETTINGS_KEY, JSON.stringify({
        match_type: form.match_type, leg: form.leg, phase: form.phase, hour,
      }))
      set({ player1_id: '', player2_id: '', group_id: '', group_auto: true })
      onCreated()
    }
    setSaving(false)
  }

  return (
    <div className="mb-14">
      <div className="flex items-center gap-2.5 mb-1">
        <CalendarPlus size={18} className="text-charo-orange" />
        <h2 className="font-bold text-lg text-ink">Programmer un match</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        Recherche un joueur par son pseudo, sa poule s'affiche automatiquement. Les derniers réglages
        (heure, règle, phase) sont mémorisés pour aller plus vite au prochain match.
      </p>

      <form onSubmit={createMatch} className="card p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlayerCombobox label="Joueur 1" players={players} groups={groups} value={form.player1_id} excludeId={form.player2_id} onChange={setPlayer1} />
        <PlayerCombobox label="Joueur 2" players={players} groups={groups} value={form.player2_id} excludeId={form.player1_id} onChange={(id) => set({ player2_id: id })} />

        <label className="block">
          <span className="block text-xs font-semibold text-muted mb-1.5">Date & heure</span>
          <input type="datetime-local" value={form.scheduled_at} onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-lg bg-surface-soft border border-line text-sm px-3 py-2.5 outline-none focus:border-charo-orange" />
          {rememberHour && <span className="block text-[10px] text-muted mt-1">Heure mémorisée : {rememberHour}</span>}
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-muted mb-1.5">Phase</span>
          <select value={form.phase} onChange={(e) => set({ phase: e.target.value })} className="w-full rounded-lg bg-surface-soft border border-line text-sm px-3 py-2.5 outline-none focus:border-charo-orange">
            {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>

        {form.phase === 'poule' ? (
          <label className="block">
            <span className="flex items-center justify-between text-xs font-semibold text-muted mb-1.5">
              Groupe {form.group_auto && form.group_id && <span className="text-charo-orange normal-case font-bold">Auto ✓</span>}
            </span>
            <select
              value={form.group_id}
              onChange={(e) => set({ group_id: e.target.value, group_auto: false })}
              className="w-full rounded-lg bg-surface-soft border border-line text-sm px-3 py-2.5 outline-none focus:border-charo-orange"
            >
              <option value="">—</option>
              {groups.map((g) => <option key={g.id} value={g.id}>Groupe {g.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="block text-xs font-semibold text-muted mb-1.5">Manche</span>
            <select value={form.leg} onChange={(e) => set({ leg: e.target.value })} className="w-full rounded-lg bg-surface-soft border border-line text-sm px-3 py-2.5 outline-none focus:border-charo-orange">
              <option value="aller">Aller</option>
              <option value="retour">Retour</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="block text-xs font-semibold text-muted mb-1.5">Règle</span>
          <select value={form.match_type} onChange={(e) => set({ match_type: e.target.value })} className="w-full rounded-lg bg-surface-soft border border-line text-sm px-3 py-2.5 outline-none focus:border-charo-orange">
            {MATCH_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Programmation…' : 'Programmer le match'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ScheduleMatchSection
