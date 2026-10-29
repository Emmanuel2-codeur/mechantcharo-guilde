import { useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { ATTENDANCE, kindLabel, fmtDateTime } from '../../lib/guild'

const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1])
  r.onerror = () => rej(new Error('Lecture du fichier impossible'))
  r.readAsDataURL(file)
})

async function callAssistant(body) {
  const { data, error } = await supabase.functions.invoke('admin-assistant', { body })
  if (error) throw new Error(error.message || 'Assistant indisponible')
  if (data?.error) throw new Error(data.error)
  return data
}

export default function AssistantAdmin({ members, events, run, setError, setMessage }) {
  return (
    <div className="space-y-12">
      <p className="text-sm text-ink-600 flex items-center gap-2">
        <Sparkles size={15} className="text-charo-orange" />
        L’assistant propose, tu valides : il ne modifie jamais les scores directement.
      </p>
      <AttendanceImport members={members} events={events} run={run} setError={setError} />
      <Announcement setError={setError} />
      <Ask members={members} events={events} setError={setError} />
    </div>
  )
}

function AttendanceImport({ members, events, run, setError }) {
  const { profile } = useAuth()
  const [eventId, setEventId] = useState('')
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [rows, setRows] = useState(null)
  const [absentRest, setAbsentRest] = useState(false)
  const [busy, setBusy] = useState(false)
  const active = members.filter((m) => m.is_active)
  const byId = Object.fromEntries(active.map((m) => [m.id, m]))

  const analyse = async () => {
    setError(''); setBusy(true); setRows(null)
    try {
      const ev = events.find((e) => e.id === eventId)
      const payload = {
        action: 'parse_attendance', text, members: active.map((m) => ({ id: m.id, pseudo: m.pseudo })),
        event_label: ev ? `${kindLabel(ev.kind)} ${fmtDateTime(ev.starts_at)}` : '',
      }
      if (image) {
        if (image.size > 4 * 1024 * 1024) throw new Error('Image trop lourde (4 Mo max).')
        payload.image = { media_type: image.type, data: await fileToBase64(image) }
      }
      const data = await callAssistant(payload)
      setRows(data.matches.map((m, i) => ({ ...m, key: i, keep: !!m.member_id })))
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const apply = async () => {
    const chosen = new Map(rows.filter((r) => r.keep && r.member_id).map((r) => [r.member_id, r.status]))
    if (absentRest) active.forEach((m) => { if (!chosen.has(m.id)) chosen.set(m.id, 'absent_unjustified') })
    const list = [...chosen].map(([member_id, status]) => ({ event_id: eventId, member_id, status, noted_by: profile?.id, noted_at: new Date().toISOString() }))
    if (!list.length) return
    if (await run(supabase.from('event_attendance').upsert(list, { onConflict: 'event_id,member_id' }), `${list.length} présence(s) enregistrée(s).`)) setRows(null)
  }

  return (
    <section>
      <h3 className="font-bold text-lg mb-1">Importer des présences</h3>
      <p className="text-sm text-ink-600 mb-4">Colle la liste WhatsApp ou envoie une capture d’écran. Vérifie les propositions avant d’enregistrer.</p>
      <div className="card p-5 space-y-3">
        <select className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Événement concerné…</option>
          {events.map((e) => <option key={e.id} value={e.id}>{kindLabel(e.kind)} — {fmtDateTime(e.starts_at)}</option>)}
        </select>
        <textarea className="input" rows={5} placeholder="Colle ici la liste des présents…" value={text} onChange={(e) => setText(e.target.value)} />
        <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        <button className="btn-primary" disabled={!eventId || busy || (!text.trim() && !image)} onClick={analyse}>
          <Sparkles size={15} /> {busy ? 'Analyse…' : 'Analyser'}
        </button>
      </div>

      {rows && (
        <div className="mt-5">
          {rows.length === 0 ? <p className="text-sm text-ink-600">Aucun nom reconnu.</p> : (
            <div className="card divide-y divide-ink-700">
              {rows.map((r) => (
                <div key={r.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <input type="checkbox" checked={r.keep} disabled={!r.member_id} onChange={(e) => setRows(rows.map((x) => x.key === r.key ? { ...x, keep: e.target.checked } : x))} />
                  <span className="w-40 text-ink-600">« {r.name} »</span>
                  <select className="input !w-48 !py-1.5" value={r.member_id || ''} onChange={(e) => setRows(rows.map((x) => x.key === r.key ? { ...x, member_id: e.target.value || null, keep: !!e.target.value } : x))}>
                    <option value="">Non reconnu</option>
                    {active.map((m) => <option key={m.id} value={m.id}>{m.pseudo}</option>)}
                  </select>
                  <select className="input !w-40 !py-1.5" value={r.status} onChange={(e) => setRows(rows.map((x) => x.key === r.key ? { ...x, status: e.target.value } : x))}>
                    {ATTENDANCE.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {r.member_id && !byId[r.member_id] && <span className="text-red-600">membre inactif</span>}
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-ink-600 mt-3">
            <input type="checkbox" checked={absentRest} onChange={(e) => setAbsentRest(e.target.checked)} />
            Marquer tous les membres non cités comme absents injustifiés
          </label>
          <button className="btn-primary mt-4" onClick={apply}>Valider et enregistrer</button>
        </div>
      )}
    </section>
  )
}

function Announcement({ setError }) {
  const [topic, setTopic] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const go = async () => {
    setError(''); setBusy(true)
    try { setDraft((await callAssistant({ action: 'draft_announcement', topic })).text) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const copy = async () => { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <section>
      <h3 className="font-bold text-lg mb-1">Rédiger une annonce</h3>
      <p className="text-sm text-ink-600 mb-4">Donne les faits (résultat de guerre, rappel, félicitations). Copie ensuite le texte dans l’onglet Annonces.</p>
      <div className="card p-5 space-y-3">
        <textarea className="input" rows={3} placeholder="Ex : victoire en guilde vs guilde contre XYZ 3-1, MVP : Pseudo…" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <button className="btn-primary" disabled={!topic.trim() || busy} onClick={go}><Sparkles size={15} /> {busy ? 'Rédaction…' : 'Rédiger'}</button>
        {draft && (
          <>
            <textarea className="input" rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn-outline" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier'}</button>
          </>
        )}
      </div>
    </section>
  )
}

function Ask({ members, events, setError }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  const buildContext = async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const [att, act, honor] = await Promise.all([
      supabase.from('event_attendance').select('member_id, status, guild_events(kind, starts_at)').gte('noted_at', since),
      supabase.rpc('guild_member_activity', { p_days: 30 }),
      supabase.rpc('member_honor'),
    ])
    const names = Object.fromEntries(members.map((m) => [m.id, m.pseudo]))
    const per = {}
    ;(att.data || []).forEach((a) => {
      const p = (per[names[a.member_id] || '?'] ||= { present: 0, partial: 0, absent_justified: 0, absent_unjustified: 0 })
      p[a.status]++
    })
    return {
      date: new Date().toISOString().slice(0, 10),
      membres: members.filter((m) => m.is_active).map((m) => {
        const a = (act.data || []).find((x) => x.member_id === m.id)
        const h = (honor.data || []).find((x) => x.member_id === m.id)
        return { pseudo: m.pseudo, role: m.guild_role, activite: a?.activity, taux_pct: a?.rate_pct, honneur_mois: h?.season_points, honneur_total: h?.total_points, presences_30j: per[m.pseudo] || {} }
      }),
      evenements_recents: events.slice(0, 12).map((e) => ({ type: e.kind, date: e.starts_at, resultat: e.result })),
    }
  }

  const go = async (question) => {
    setError(''); setBusy(true); setAnswer('')
    try { setAnswer((await callAssistant({ action: 'ask', question, context: await buildContext() })).text) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const presets = ['Fais le résumé de la semaine.', 'Quels membres risquent d’être inactifs ?', 'Qui mérite d’être félicité ce mois-ci ?']
  return (
    <section>
      <h3 className="font-bold text-lg mb-1">Poser une question</h3>
      <p className="text-sm text-ink-600 mb-4">L’assistant répond à partir des présences et scores des 30 derniers jours.</p>
      <div className="card p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => <button key={p} className="btn-outline !py-1.5 text-xs" disabled={busy} onClick={() => { setQ(p); go(p) }}>{p}</button>)}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="Ex : qui a raté plus de 2 guerres ce mois-ci ?" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary" disabled={!q.trim() || busy} onClick={() => go(q)}>{busy ? '…' : 'Demander'}</button>
        </div>
        {answer && <div className="rounded-xl bg-charo-orange/5 border border-charo-orange/20 p-4 text-sm whitespace-pre-wrap">{answer}</div>}
      </div>
    </section>
  )
}
