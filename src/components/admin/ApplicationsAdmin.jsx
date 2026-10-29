import { useEffect, useState } from 'react'
import { Check, X, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  accepted: { label: 'Acceptée', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Refusée', cls: 'bg-red-50 text-red-700' },
}

export default function ApplicationsAdmin({ run, setError, setMessage, onChanged }) {
  const [apps, setApps] = useState([])
  const [notes, setNotes] = useState({})
  const [mailInfo, setMailInfo] = useState({})

  const load = async () => {
    const { data, error } = await supabase.from('guild_applications').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) { setError(`Candidatures : ${error.message} (sql/07_guild_applications.sql exécuté ?)`); return }
    setApps(data || [])
  }
  useEffect(() => { load() }, [])

  const decide = async (app, decision) => {
    const ok = await run(supabase.rpc('review_guild_application', { p_id: app.id, p_decision: decision, p_note: notes[app.id] || null }),
      decision === 'accepted' ? `${app.pseudo} accepté(e) et ajouté(e) aux membres.` : `Candidature de ${app.pseudo} refusée.`)
    if (!ok) return
    // Email au candidat (si la fonction est déployée) ; sinon lien mailto de secours
    const { data } = await supabase.functions.invoke('send-application-decision', { body: { application_id: app.id } })
    setMailInfo((m) => ({ ...m, [app.id]: data?.sent ? 'sent' : 'manual' }))
    if (data?.sent) setMessage(`Email envoyé à ${app.email}.`)
    await load(); onChanged?.()
  }

  const mailto = (a) => {
    const ok = a.status === 'accepted'
    const subject = ok ? 'Bienvenue dans la guilde MÉCHANTCHARO !' : 'Ta candidature à la guilde MÉCHANTCHARO'
    const body = ok
      ? `Bonjour ${a.pseudo},\n\nTa candidature a été acceptée : bienvenue dans la guilde MÉCHANTCHARO !${a.admin_note ? `\n\n${a.admin_note}` : ''}`
      : `Bonjour ${a.pseudo},\n\nMerci pour ta candidature. Nous ne pouvons pas y donner suite pour le moment.${a.admin_note ? `\n\n${a.admin_note}` : ''}`
    return `mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (!apps.length) return <p className="text-sm text-ink-600">Aucune candidature pour l’instant.</p>

  return (
    <div className="space-y-4">
      {apps.map((a) => (
        <div key={a.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-lg">{a.pseudo}</p>
              <p className="text-sm text-ink-600">ID {a.ff_uid} · {a.email}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
          </div>
          <dl className="text-sm text-ink-600 space-y-1 mb-3">
            {a.game_rank && <div><dt className="inline font-semibold text-ink-950">Rang : </dt><dd className="inline">{a.game_rank}</dd></div>}
            {a.availability && <div><dt className="inline font-semibold text-ink-950">Disponibilités : </dt><dd className="inline">{a.availability}</dd></div>}
            {a.message && <p className="whitespace-pre-wrap">{a.message}</p>}
            <p className="text-xs">Reçue le {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
          </dl>
          {a.status === 'pending' ? (
            <div className="space-y-3">
              <input className="input" maxLength={500} placeholder="Message pour le candidat (optionnel)" value={notes[a.id] || ''} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => decide(a, 'accepted')}><Check size={15} /> Accepter</button>
                <button className="btn-outline text-red-600 border-red-200" onClick={() => decide(a, 'rejected')}><X size={15} /> Refuser</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {a.admin_note && <span className="text-ink-600">Note : {a.admin_note}</span>}
              {mailInfo[a.id] !== 'sent' && <a href={mailto(a)} className="btn-outline !py-1.5 text-xs"><Mail size={14} /> Écrire au candidat</a>}
              {mailInfo[a.id] === 'sent' && <span className="text-green-700">Email envoyé</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
