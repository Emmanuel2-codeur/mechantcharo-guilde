import { useRef, useState } from 'react'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { CheckCircle2 } from 'lucide-react'
import { Page, PageHeader } from '@/shared/ui'
import { supabase } from '@/shared/lib/supabaseClient'

const empty = { pseudo: '', ff_uid: '', email: '', game_rank: '', message: '', website: '' }

export default function Rejoindre() {
  const ref = useRef(null)
  useReveal(ref, [])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.website) { setDone(true); return } // champ piège anti-robots
    setBusy(true)
    const { error } = await supabase.rpc('submit_guild_application', {
      p_pseudo: form.pseudo, p_ff_uid: form.ff_uid, p_email: form.email,
      p_game_rank: form.game_rank, p_message: form.message,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div ref={ref}>
      <Page size="sm">
        <PageHeader eyebrow="Candidature" title="Rejoindre la guilde" lead="Présente-toi en quelques lignes. Un admin examine ta candidature et te répond par email." />

        {done ? (
          <div className="card p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-600 mb-4" />
            <h2 className="font-display text-3xl mb-2">Candidature envoyée</h2>
            <p className="text-muted">Nous avons bien reçu ta demande. Tu recevras une réponse à l’adresse indiquée.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <Field label="Pseudo en jeu *"><input className="input" required minLength={2} maxLength={40} value={form.pseudo} onChange={set('pseudo')} /></Field>
            <Field label="ID Free Fire *"><input className="input" required minLength={4} maxLength={20} inputMode="numeric" value={form.ff_uid} onChange={set('ff_uid')} /></Field>
            <Field label="Email *"><input className="input" type="email" required maxLength={120} value={form.email} onChange={set('email')} /></Field>
            <Field label="Rang en jeu"><input className="input" maxLength={40} placeholder="Ex : Héroïque, Grand Maître…" value={form.game_rank} onChange={set('game_rank')} /></Field>
            <Field label="Parle-nous de toi"><textarea className="input" rows={4} maxLength={800} value={form.message} onChange={set('message')} /></Field>
            {/* Champ piège : invisible pour les humains */}
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={form.website} onChange={set('website')} />
            <p className="text-xs text-muted">Ton email est visible uniquement par les admins et sert à te répondre.</p>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma candidature'}</button>
          </form>
        )}
      </Page>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-sm font-semibold mb-1.5">{label}</span>{children}</label>
}
