import { useEffect, useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const num = (v) => Math.max(0, parseInt(v, 10) || 0)

export default function DuoAdmin({ members, run, setError }) {
  const [duos, setDuos] = useState([])
  const [form, setForm] = useState({ name: '', member_a: '', member_b: '' })
  const active = members.filter((m) => m.is_active)
  const pseudo = (id) => members.find((m) => m.id === id)?.pseudo || '?'

  const load = async () => {
    const { data, error } = await supabase.from('guild_duos').select('*').order('points', { ascending: false })
    if (error) { setError(`Duos : ${error.message} (sql/09_guild_duos.sql exécuté ?)`); return }
    setDuos(data || [])
  }
  useEffect(() => { load() }, [])

  const edit = (id, patch) => setDuos(duos.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const save = async (d) => {
    if (await run(supabase.from('guild_duos').update({ name: d.name?.trim() || null, points: parseInt(d.points, 10) || 0, wins: num(d.wins), losses: num(d.losses), is_active: d.is_active }).eq('id', d.id), 'Duo enregistré.')) load()
  }
  const add = async (e) => {
    e.preventDefault()
    if (!form.member_a || !form.member_b) return
    if (form.member_a === form.member_b) { setError('Choisis deux membres différents.'); return }
    if (await run(supabase.from('guild_duos').insert({ name: form.name.trim() || null, member_a: form.member_a, member_b: form.member_b }), 'Duo créé.')) {
      setForm({ name: '', member_a: '', member_b: '' }); load()
    }
  }

  return (
    <div>
      <p className="text-sm text-ink-600 mb-4">Crée les duos de la guilde et saisis leurs points et résultats : le classement public se met à jour automatiquement.</p>
      <form onSubmit={add} className="card p-5 grid md:grid-cols-4 gap-3 mb-6">
        <input className="input" maxLength={40} placeholder="Nom du duo (optionnel)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="input" value={form.member_a} onChange={(e) => setForm({ ...form, member_a: e.target.value })}>
          <option value="">Joueur 1…</option>{active.map((m) => <option key={m.id} value={m.id}>{m.pseudo}</option>)}
        </select>
        <select className="input" value={form.member_b} onChange={(e) => setForm({ ...form, member_b: e.target.value })}>
          <option value="">Joueur 2…</option>{active.filter((m) => m.id !== form.member_a).map((m) => <option key={m.id} value={m.id}>{m.pseudo}</option>)}
        </select>
        <button className="btn-primary"><Plus size={15} /> Créer le duo</button>
      </form>

      <div className="card divide-y divide-ink-700">
        {duos.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-[200px]">
              <input className="input !py-1.5 mb-1" maxLength={40} placeholder="Nom du duo" value={d.name || ''} onChange={(e) => edit(d.id, { name: e.target.value })} />
              <p className={`text-xs ${d.is_active ? 'text-ink-600' : 'text-ink-600 line-through'}`}>{pseudo(d.member_a)} &amp; {pseudo(d.member_b)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[['points', 'Points'], ['wins', 'V'], ['losses', 'D']].map(([k, l]) => (
                <label key={k} className="text-xs text-ink-600 flex items-center gap-1.5">
                  {l}<input type="number" className="input !w-20 !py-1.5" value={d[k]} onChange={(e) => edit(d.id, { [k]: e.target.value })} />
                </label>
              ))}
              <button className="btn-primary !py-2 text-xs" onClick={() => save(d)}><Save size={14} /> Enregistrer</button>
              <button className="btn-outline !py-2 text-xs" onClick={() => { edit(d.id, { is_active: !d.is_active }); save({ ...d, is_active: !d.is_active }) }}>{d.is_active ? 'Masquer' : 'Afficher'}</button>
              <button aria-label="Supprimer" className="text-ink-600 hover:text-red-600"
                onClick={() => window.confirm('Supprimer ce duo ?') && run(supabase.from('guild_duos').delete().eq('id', d.id), 'Duo supprimé.').then(load)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {!duos.length && <p className="p-6 text-sm text-ink-600">Aucun duo pour l’instant.</p>}
      </div>
    </div>
  )
}
