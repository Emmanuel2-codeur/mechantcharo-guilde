import { useEffect, useState } from 'react'
import { Crown, Eraser } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { titleIcon } from '@/features/charodor/titles'

/** Désignation des détenteurs du Charo d'Or : l'admin choisit le joueur, la valeur du record, et enregistre. */
export default function CharoDorAdmin({ members, run, setError }) {
  const titles = useSupabaseQuery(() => supabase.from('charo_dor_titles').select('*').order('sort_order'), [])
  const records = useSupabaseQuery(() => supabase.from('charo_dor_records').select('id, title_id, member_id, value, season, note').eq('is_current', true), [])
  const [forms, setForms] = useState({})
  const active = members.filter((m) => m.is_active)

  useEffect(() => {
    if (titles.error || records.error) setError(`Charo d'Or : ${(titles.error || records.error).message} (sql/guild/07_charo_dor.sql exécuté ?)`)
  }, [titles.error, records.error])

  const cur = (titleId) => (records.data || []).find((r) => r.title_id === titleId)
  const form = (t) => forms[t.id] ?? { member_id: cur(t.id)?.member_id || '', value: cur(t.id)?.value || '', season: cur(t.id)?.season || '', note: cur(t.id)?.note || '' }
  const set = (t, patch) => setForms({ ...forms, [t.id]: { ...form(t), ...patch } })
  const refresh = () => { setForms({}); records.refetch() }

  const save = async (t) => {
    const f = form(t)
    if (!f.member_id) { setError('Choisis un joueur.'); return }
    const ok = await run(supabase.rpc('set_charo_dor_holder', { p_title: t.id, p_member: f.member_id, p_value: f.value, p_season: f.season, p_note: f.note }), `${t.label} : joueur désigné.`)
    if (ok) refresh()
  }
  const clear = async (t) => {
    if (!window.confirm('Laisser ce titre vacant ? Le détenteur actuel ira dans l’historique.')) return
    if (await run(supabase.rpc('clear_charo_dor_holder', { p_title: t.id }), `${t.label} : titre laissé vacant.`)) refresh()
  }

  return (
    <div>
      <p className="mb-5 text-sm text-muted">Choisis le joueur qui détient chaque titre. L’ancien détenteur est conservé dans l’historique public.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {(titles.data || []).map((t) => {
          const Icon = titleIcon(t.code)
          const f = form(t)
          const holder = cur(t.id)
          return (
            <div key={t.id} className="card p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-charo-orange/10 text-charo-orange"><Icon size={18} /></span>
                <div>
                  <p className="font-bold leading-tight">{t.label}</p>
                  <p className="text-xs text-muted">{holder ? `Actuel : ${members.find((m) => m.id === holder.member_id)?.pseudo || '?'}` : 'Titre vacant'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <select className="input" value={f.member_id} onChange={(e) => set(t, { member_id: e.target.value })}>
                  <option value="">Choisir le joueur…</option>
                  {active.map((m) => <option key={m.id} value={m.id}>{m.pseudo}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" maxLength={60} placeholder={t.value_hint || 'Valeur du record'} value={f.value} onChange={(e) => set(t, { value: e.target.value })} />
                  {t.code === 'saison'
                    ? <input className="input" maxLength={60} placeholder="Saison (ex. juil.–sept. 2026)" value={f.season} onChange={(e) => set(t, { season: e.target.value })} />
                    : <input className="input" maxLength={300} placeholder="Note (optionnelle)" value={f.note} onChange={(e) => set(t, { note: e.target.value })} />}
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="btn-primary !py-2 text-xs" onClick={() => save(t)}><Crown size={14} /> Désigner</button>
                  {holder && <button className="btn-outline !py-2 text-xs" onClick={() => clear(t)}><Eraser size={14} /> Laisser vacant</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
