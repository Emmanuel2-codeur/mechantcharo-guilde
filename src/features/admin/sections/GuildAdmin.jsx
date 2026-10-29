import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardCheck, Users, Award, Sparkles, AlertTriangle, Download, UserPlus, Swords, Crown, Trash2, Plus, Wand2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import HonorAdmin from '@/features/admin/sections/HonorAdmin'
import AssistantAdmin from '@/features/admin/sections/AssistantAdmin'
import DuoAdmin from '@/features/admin/sections/DuoAdmin'
import CharoDorAdmin from '@/features/admin/sections/CharoDorAdmin'
import ApplicationsAdmin from '@/features/admin/sections/ApplicationsAdmin'
import { GUILD_ROLES, EVENT_KINDS, ATTENDANCE, RESULTS, kindLabel, fmtDateTime } from '@/features/guild/guild'

const SUBTABS = [
  { id: 'candidatures', label: 'Candidatures', icon: UserPlus },
  { id: 'presences', label: 'Présences', icon: ClipboardCheck },
  { id: 'evenements', label: 'Événements', icon: CalendarDays },
  { id: 'membres', label: 'Membres', icon: Users },
  { id: 'duos', label: 'Duos', icon: Swords },
  { id: 'charodor', label: 'Charo d’Or', icon: Crown },
  { id: 'honneur', label: 'Honneur & badges', icon: Award },
  { id: 'assistant', label: 'Assistant IA', icon: Sparkles },
]

export default function GuildAdmin({ setMessage, setError }) {
  const { profile } = useAuth()
  const [sub, setSubState] = useState(() => {
    const wanted = new URLSearchParams(window.location.search).get('sub')
    return SUBTABS.some((t) => t.id === wanted) ? wanted : 'candidatures'
  })
  // L'onglet courant est dans l'URL (?tab=guilde&sub=presences) : lien partageable, retour arrière fonctionnel.
  const setSub = (id) => {
    setSubState(id)
    const url = new URL(window.location.href)
    url.searchParams.set('sub', id)
    window.history.replaceState({}, '', url)
  }
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [accounts, setAccounts] = useState([])
  const [pendingApps, setPendingApps] = useState(0)

  const load = async () => {
    const [m, e, p] = await Promise.all([
      supabase.from('guild_members').select('*').order('pseudo'),
      supabase.from('guild_events').select('*').order('starts_at', { ascending: false }).limit(120),
      supabase.from('profiles').select('id, pseudo').eq('status', 'approved').order('pseudo'),
    ])
    const err = m.error || e.error
    if (err) setError(`Vie de guilde : ${err.message} (le script sql/04_guild_phase2.sql a-t-il été exécuté ?)`)
    setMembers(m.data || []); setEvents(e.data || []); setAccounts(p.data || [])
    const apps = await supabase.from('guild_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    setPendingApps(apps.count || 0)
  }
  useEffect(() => { load() }, [])

  const run = async (promise, okMsg) => {
    setError(''); setMessage('')
    const { error } = await promise
    if (error) { setError(error.message); return false }
    if (okMsg) setMessage(okMsg)
    await load()
    return true
  }

  return (
    <div className="mb-14">
      <div className="flex gap-2 mb-6">
        {SUBTABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSub(id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${sub === id ? 'border-charo-orange text-charo-orange bg-charo-orange/5' : 'border-line text-muted bg-white'}`}>
            <Icon size={15} /> {label}
            {id === 'candidatures' && pendingApps > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-charo-orange text-white text-[10px] flex items-center justify-center">{pendingApps}</span>}
          </button>
        ))}
      </div>
      {sub === 'candidatures' && <ApplicationsAdmin run={run} setError={setError} setMessage={setMessage} onChanged={load} />}
      {sub === 'presences' && <Presences members={members} events={events} profile={profile} run={run} setMessage={setMessage} setError={setError} />}
      {sub === 'evenements' && <Events events={events} run={run} />}
      {sub === 'assistant' && <AssistantAdmin members={members} events={events} run={run} setError={setError} setMessage={setMessage} />}
      {sub === 'charodor' && <CharoDorAdmin members={members} run={run} setError={setError} />}
      {sub === 'duos' && <DuoAdmin members={members} run={run} setError={setError} />}
      {sub === 'honneur' && <HonorAdmin members={members} run={run} setError={setError} />}
      {sub === 'membres' && <Members members={members} accounts={accounts} run={run} />}
    </div>
  )
}

function Presences({ members, events, profile, run, setMessage, setError }) {
  const [eventId, setEventId] = useState('')
  const [marks, setMarks] = useState({})
  const active = useMemo(() => members.filter((m) => m.is_active), [members])
  const now = Date.now()
  const options = useMemo(() => [...events].sort((a, b) => Math.abs(new Date(a.starts_at) - now) - Math.abs(new Date(b.starts_at) - now)), [events])

  useEffect(() => {
    if (!eventId) { setMarks({}); return }
    supabase.from('event_attendance').select('member_id, status').eq('event_id', eventId).then(({ data, error }) => {
      if (error) { setError(error.message); return }
      setMarks(Object.fromEntries((data || []).map((r) => [r.member_id, r.status])))
    })
  }, [eventId])

  const save = async () => {
    const rows = Object.entries(marks).map(([member_id, status]) => ({ event_id: eventId, member_id, status, noted_by: profile?.id, noted_at: new Date().toISOString() }))
    if (!rows.length) { setError('Aucune présence à enregistrer.'); return }
    await run(supabase.from('event_attendance').upsert(rows, { onConflict: 'event_id,member_id' }), `${rows.length} présence(s) enregistrée(s).`)
  }

  if (!events.length) return <p className="text-sm text-muted">Crée d’abord un événement (onglet Événements).</p>
  if (!active.length) return <p className="text-sm text-muted">Ajoute d’abord des membres (onglet Membres).</p>

  return (
    <div>
      <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="input max-w-md mb-5">
        <option value="">Choisir un événement…</option>
        {options.map((ev) => <option key={ev.id} value={ev.id}>{kindLabel(ev.kind)} — {fmtDateTime(ev.starts_at)}</option>)}
      </select>
      {eventId && (
        <>
          <div className="flex gap-2 mb-4">
            <button className="btn-outline !py-2 text-xs" onClick={() => setMarks(Object.fromEntries(active.map((m) => [m.id, marks[m.id] || 'present'])))}>Tout le monde présent</button>
            <button className="btn-primary !py-2 text-xs" onClick={save}>Enregistrer</button>
          </div>
          <div className="card divide-y divide-line">
            {active.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="font-semibold">{m.pseudo}</span>
                <div className="flex gap-1.5">
                  {ATTENDANCE.map((a) => (
                    <button key={a.value} onClick={() => setMarks({ ...marks, [m.id]: a.value })}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${marks[m.id] === a.value ? a.cls : 'border-line text-muted bg-white'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Events({ events, run }) {
  const [form, setForm] = useState({ kind: 'gvg', title: '', starts_at: '', notes: '' })
  const add = async (e) => {
    e.preventDefault()
    if (!form.starts_at) return
    const ok = await run(supabase.from('guild_events').insert({
      kind: form.kind, title: form.title.trim() || kindLabel(form.kind),
      starts_at: new Date(form.starts_at).toISOString(), notes: form.notes || null,
    }), 'Événement créé.')
    if (ok) setForm({ ...form, title: '', notes: '' })
  }
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="btn-outline" onClick={() => run(supabase.rpc('generate_weekly_wars', { p_weeks: 4 }), 'Guerres des 4 prochaines semaines générées (mer, ven, sam à 20h).')}>
          <Wand2 size={15} /> Générer les guerres (4 semaines)
        </button>
      </div>
      <form onSubmit={add} className="card p-5 grid md:grid-cols-4 gap-3 mb-6">
        <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {EVENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <input className="input" placeholder="Titre (ex : GvG contre …)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        <button className="btn-primary"><Plus size={15} /> Ajouter</button>
      </form>
      <div className="card divide-y divide-line max-h-[480px] overflow-y-auto">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div><p className="font-semibold">{ev.title}</p><p className="text-muted">{kindLabel(ev.kind)} · {fmtDateTime(ev.starts_at)}</p></div>
            <div className="flex items-center gap-3">
            {['guerre', 'gvg'].includes(ev.kind) && (
              <select className="input !w-36 !py-1.5 text-xs" value={ev.result || ''}
                onChange={(e) => run(supabase.from('guild_events').update({ result: e.target.value || null }).eq('id', ev.id))}>
                {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            <button aria-label="Supprimer" className="text-muted hover:text-red-600"
              onClick={() => window.confirm('Supprimer cet événement et ses présences ?') && run(supabase.from('guild_events').delete().eq('id', ev.id), 'Événement supprimé.')}>
              <Trash2 size={15} />
            </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Members({ members, accounts, run }) {
  const [form, setForm] = useState({ pseudo: '', ff_uid: '', guild_role: 'recrue', profile_id: '', game_rank: '' })
  const add = async (e) => {
    e.preventDefault()
    if (!form.pseudo.trim()) return
    const ok = await run(supabase.from('guild_members').insert({
      pseudo: form.pseudo.trim(), ff_uid: form.ff_uid.trim() || null, guild_role: form.guild_role, profile_id: form.profile_id || null, game_rank: form.game_rank.trim() || null,
    }), 'Membre ajouté.')
    if (ok) setForm({ pseudo: '', ff_uid: '', guild_role: 'recrue', profile_id: '', game_rank: '' })
  }
  const update = (id, patch) => run(supabase.from('guild_members').update(patch).eq('id', id))
  const [watch, setWatch] = useState([])
  useEffect(() => {
    supabase.rpc('guild_member_activity', { p_days: 30 }).then(({ data }) =>
      setWatch((data || []).filter((a) => a.activity === 'inactif' || a.activity === 'irregulier')))
  }, [members.length])
  const nameOf = (id) => members.find((m) => m.id === id)?.pseudo
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="btn-outline" onClick={async () => {
          const { data, error } = await supabase.rpc('import_players_as_members')
          if (error) return run(Promise.resolve({ error }))
          run(Promise.resolve({ error: null }), `${data} joueur(s) approuvé(s) importé(s) comme membres.`)
        }}><Download size={15} /> Importer les joueurs approuvés</button>
      </div>
      {watch.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-sm">
          <p className="font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle size={15} /> Membres à surveiller (30 derniers jours)</p>
          <p className="text-amber-900">
            {watch.map((a) => `${nameOf(a.member_id) || '?'} (${a.activity === 'inactif' ? 'inactif' : 'irrégulier'}, ${a.rate_pct} %)`).join(' · ')}
          </p>
        </div>
      )}
      <form onSubmit={add} className="card p-5 grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <input className="input" placeholder="Pseudo" required value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} />
        <input className="input" placeholder="ID Free Fire" value={form.ff_uid} onChange={(e) => setForm({ ...form, ff_uid: e.target.value })} />
        <input className="input" maxLength={40} placeholder="Rang en jeu" value={form.game_rank} onChange={(e) => setForm({ ...form, game_rank: e.target.value })} />
        <select className="input" value={form.guild_role} onChange={(e) => setForm({ ...form, guild_role: e.target.value })}>
          {GUILD_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="input" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })}>
          <option value="">Sans compte lié</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.pseudo}</option>)}
        </select>
        <button className="btn-primary"><Plus size={15} /> Ajouter</button>
      </form>
      <div className="card divide-y divide-line">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className={`font-semibold ${m.is_active ? '' : 'text-muted line-through'}`}>{m.pseudo}</span>
            <div className="flex items-center gap-2">
              <input className="input !w-36 !py-1.5 text-xs" maxLength={40} placeholder="Rang en jeu" defaultValue={m.game_rank || ''}
                onBlur={(e) => e.target.value.trim() !== (m.game_rank || '') && update(m.id, { game_rank: e.target.value.trim() || null })} />
              <select className="input !py-1.5 text-xs" value={m.guild_role} onChange={(e) => update(m.id, { guild_role: e.target.value })}>
                {GUILD_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button className="btn-outline !py-1.5 text-xs" onClick={() => update(m.id, { is_active: !m.is_active })}>{m.is_active ? 'Désactiver' : 'Réactiver'}</button>
              <button aria-label="Supprimer" className="text-muted hover:text-red-600"
                onClick={() => window.confirm(`Supprimer ${m.pseudo} et son historique de présences ?`) && run(supabase.from('guild_members').delete().eq('id', m.id), 'Membre supprimé.')}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {!members.length && <p className="p-6 text-sm text-muted">Aucun membre pour l’instant.</p>}
      </div>
    </div>
  )
}
