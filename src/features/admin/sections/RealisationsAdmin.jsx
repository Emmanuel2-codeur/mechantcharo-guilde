import { useEffect, useState } from 'react'
import { Trash2, Plus, Flag } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'

const KINDS = [
  { value: 'gvg_win', label: 'Guilde vaincue en GVG' },
  { value: 'distinction', label: 'Distinction' },
  { value: 'palmares', label: 'Palmarès' },
]
const kindLabel = (k) => KINDS.find((x) => x.value === k)?.label || k

/** Réalisations publiques : classement actuel et passé de la guilde, victoires en GVG, distinctions. */
export default function RealisationsAdmin({ run, setError }) {
  const ranks = useSupabaseQuery(() => supabase.from('guild_rank_history').select('*').order('is_current', { ascending: false }).order('created_at', { ascending: false }), [])
  const items = useSupabaseQuery(() => supabase.from('guild_achievements').select('*').order('created_at', { ascending: false }).limit(200), [])
  const [cur, setCur] = useState({ rank: '', scope: 'Togo', note: '' })
  const [past, setPast] = useState({ rank: '', scope: 'Togo', period_label: '' })
  const [item, setItem] = useState({ kind: 'gvg_win', title: '', detail: '', achieved_on: '' })
  const current = (ranks.data || []).find((r) => r.is_current)

  useEffect(() => {
    const err = ranks.error || items.error
    if (err) setError(`Réalisations : ${err.message} (sql/guild/10_profiles_achievements.sql exécuté ?)`)
  }, [ranks.error, items.error])
  const done = (ok) => { if (ok) { ranks.refetch(); items.refetch() } return ok }

  return (
    <div className="space-y-12">
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-lg font-bold"><Flag size={18} className="text-charo-orange" /> Classement actuel de la guilde</h3>
        <p className="mb-4 text-sm text-muted">{current ? `Actuellement : N°${current.rank} (${current.scope}). L'enregistrer à nouveau déplace l'ancien classement dans « Classements passés ».` : 'Aucun classement défini.'}</p>
        <form className="card grid gap-3 p-5 md:grid-cols-4" onSubmit={async (e) => {
          e.preventDefault()
          if (!(parseInt(cur.rank, 10) > 0)) return
          if (done(await run(supabase.rpc('set_current_guild_rank', { p_rank: parseInt(cur.rank, 10), p_scope: cur.scope, p_note: cur.note }), 'Classement actuel mis à jour.'))) setCur({ rank: '', scope: cur.scope, note: '' })
        }}>
          <input className="input" type="number" min="1" placeholder="Rang (ex. 1)" value={cur.rank} onChange={(e) => setCur({ ...cur, rank: e.target.value })} />
          <input className="input" maxLength={40} placeholder="Périmètre (Togo…)" value={cur.scope} onChange={(e) => setCur({ ...cur, scope: e.target.value })} />
          <input className="input" maxLength={200} placeholder="Note (optionnelle)" value={cur.note} onChange={(e) => setCur({ ...cur, note: e.target.value })} />
          <button className="btn-primary">Définir</button>
        </form>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-bold">Classements passés</h3>
        <p className="mb-4 text-sm text-muted">Ajoute à la main un ancien classement (avec sa période).</p>
        <form className="card mb-4 grid gap-3 p-5 md:grid-cols-4" onSubmit={async (e) => {
          e.preventDefault()
          if (!(parseInt(past.rank, 10) > 0)) return
          if (done(await run(supabase.from('guild_rank_history').insert({ rank: parseInt(past.rank, 10), scope: past.scope || 'Togo', period_label: past.period_label.trim() || null, is_current: false }), 'Classement passé ajouté.'))) setPast({ rank: '', scope: past.scope, period_label: '' })
        }}>
          <input className="input" type="number" min="1" placeholder="Rang" value={past.rank} onChange={(e) => setPast({ ...past, rank: e.target.value })} />
          <input className="input" maxLength={40} placeholder="Périmètre" value={past.scope} onChange={(e) => setPast({ ...past, scope: e.target.value })} />
          <input className="input" maxLength={60} placeholder="Période (ex. Saison 1 · 2026)" value={past.period_label} onChange={(e) => setPast({ ...past, period_label: e.target.value })} />
          <button className="btn-outline"><Plus size={15} /> Ajouter</button>
        </form>
        <div className="card divide-y divide-line">
          {(ranks.data || []).filter((r) => !r.is_current).map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span><strong>N°{r.rank}</strong> · {r.scope} · {r.period_label || [r.started_on, r.ended_on].filter(Boolean).join(' → ') || '—'}</span>
              <button aria-label="Supprimer" className="text-muted hover:text-red-600" onClick={() => window.confirm('Supprimer ce classement passé ?') && done(run(supabase.from('guild_rank_history').delete().eq('id', r.id)))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!(ranks.data || []).some((r) => !r.is_current) && <p className="p-5 text-sm text-muted">Aucun classement passé.</p>}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-bold">Victoires en GVG et distinctions</h3>
        <p className="mb-4 text-sm text-muted">Pour une guilde vaincue : titre = nom de la guilde, détail = score (ex. 3–1).</p>
        <form className="card mb-4 grid gap-3 p-5 md:grid-cols-5" onSubmit={async (e) => {
          e.preventDefault()
          if (item.title.trim().length < 2) return
          if (done(await run(supabase.from('guild_achievements').insert({ kind: item.kind, title: item.title.trim(), detail: item.detail.trim() || null, achieved_on: item.achieved_on || null }), 'Réalisation ajoutée.'))) setItem({ ...item, title: '', detail: '', achieved_on: '' })
        }}>
          <select className="input" value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value })}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
          <input className="input" maxLength={80} placeholder={item.kind === 'gvg_win' ? 'Nom de la guilde vaincue' : 'Titre'} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          <input className="input" maxLength={200} placeholder={item.kind === 'gvg_win' ? 'Score (ex. 3–1)' : 'Détail'} value={item.detail} onChange={(e) => setItem({ ...item, detail: e.target.value })} />
          <input className="input" type="date" value={item.achieved_on} onChange={(e) => setItem({ ...item, achieved_on: e.target.value })} />
          <button className="btn-primary"><Plus size={15} /> Ajouter</button>
        </form>
        <div className="card max-h-[420px] divide-y divide-line overflow-y-auto">
          {(items.data || []).map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span><strong>{a.title}</strong> <span className="text-muted">· {kindLabel(a.kind)}{a.detail ? ` · ${a.detail}` : ''}{a.achieved_on ? ` · ${a.achieved_on}` : ''}</span></span>
              <button aria-label="Supprimer" className="text-muted hover:text-red-600" onClick={() => window.confirm('Supprimer cette réalisation ?') && done(run(supabase.from('guild_achievements').delete().eq('id', a.id)))}><Trash2 size={15} /></button>
            </div>
          ))}
          {!(items.data || []).length && <p className="p-5 text-sm text-muted">Aucune réalisation pour l’instant.</p>}
        </div>
      </section>
    </div>
  )
}
