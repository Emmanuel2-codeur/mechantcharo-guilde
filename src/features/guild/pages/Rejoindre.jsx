import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { gsap, prefersReducedMotion } from '@/shared/lib/gsap'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccess } from '@/features/auth/useAccess'
import { Page, PageHeader, Card, Button, Spinner } from '@/shared/ui'
import { getCountries } from '@/features/guild/countries'

const STEPS = ['Tes infos', 'Ton origine', 'Règlement']
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Texte de secours si le règlement n'a pas encore été publié en base (sql/guild/11_applications_v2.sql).
const FALLBACK_RULES = `1. Respect\nRespecte tous les membres, les chefs et les adversaires.\n\n2. Participation\nLes guerres de guilde ont lieu le mercredi, le vendredi et le samedi. Une absence doit être signalée à l'avance.\n\n3. Fair-play\nAucune triche, aucun hack, aucun compte partagé.\n\n4. Discipline\nLes décisions des chefs et des admins sont respectées.\n\nEn envoyant ma candidature, je confirme avoir lu ce règlement et je l'accepte.`

const empty = { pseudo: '', ff_uid: '', email: '', game_rank: '', message: '', is_togolese: null, speaks_ewe: null, country: '', accepted: false, website: '' }

function Choice({ value, current, onChange, children }) {
  const on = current === value
  return (
    <button type="button" onClick={() => onChange(value)} aria-pressed={on}
      className={`flex-1 rounded-2xl border-2 px-5 py-4 text-base font-bold transition-all ${on ? 'border-charo-orange bg-charo-orange/10 text-charo-orange' : 'border-line bg-white text-ink hover:border-ink'}`}>
      {children}
    </button>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

function Stepper({ step }) {
  return (
    <ol className="mb-8 flex items-center" aria-label="Progression">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <span className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold transition-colors ${done ? 'bg-charo-orange text-white' : active ? 'bg-ink text-white' : 'bg-surface-soft text-muted'}`}>
                {done ? <Check size={16} /> : n}
              </span>
              <span className={`hidden text-sm font-bold sm:block ${active ? 'text-ink' : 'text-muted'}`}>{label}</span>
            </span>
            {n < STEPS.length && <span className={`mx-3 h-0.5 flex-1 rounded ${done ? 'bg-charo-orange' : 'bg-line'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

export default function Rejoindre() {
  const ref = useRef(null)
  const panelRef = useRef(null)
  const dir = useRef(1)
  const { session } = useAuth()
  const { isMember } = useAccess()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const set = (patch) => { setError(''); setForm((f) => ({ ...f, ...patch })) }
  useReveal(ref, [])

  const rules = useSupabaseQuery(() => supabase.from('guild_rules').select('version, body').eq('is_current', true).maybeSingle(), [])
  const mine = useSupabaseQuery(
    () => supabase.from('guild_applications').select('id, status, created_at').eq('profile_id', session.user.id).order('created_at', { ascending: false }).limit(1),
    [session?.user?.id], { enabled: !!session },
  )
  const countries = useMemo(() => getCountries(), [])
  const accountEmail = session?.user?.email || ''
  const email = accountEmail || form.email

  // Animation GSAP à chaque changement d'étape
  useLayoutEffect(() => {
    if (!panelRef.current || prefersReducedMotion()) return undefined
    const tween = gsap.fromTo(panelRef.current, { x: 32 * dir.current, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
    return () => tween.kill()
  }, [step])

  const validate = (s) => {
    if (s === 1) {
      if (form.pseudo.trim().length < 2) return 'Indique ton pseudo en jeu.'
      if (form.ff_uid.trim().length < 4) return 'Indique ton ID Free Fire.'
      if (!EMAIL_RE.test(email.trim())) return 'Indique une adresse email valide.'
    }
    if (s === 2) {
      if (form.is_togolese === null) return 'Indique si tu es togolais.'
      if (form.is_togolese && form.speaks_ewe === null) return 'Indique si tu parles éwé.'
      if (form.is_togolese === false && !form.country) return 'Indique ton pays.'
    }
    if (s === 3 && !form.accepted) return 'Tu dois accepter le règlement pour envoyer ta candidature.'
    return ''
  }

  const go = (to) => { dir.current = to > step ? 1 : -1; setError(''); setStep(to) }
  const next = () => { const e = validate(step); if (e) return setError(e); go(step + 1) }

  const submit = async (e) => {
    e.preventDefault()
    if (form.website) { setDone(true); return } // champ piège anti-robots
    const err = validate(3) || validate(2) || validate(1)
    if (err) return setError(err)
    setBusy(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('submit_guild_application', {
      p_pseudo: form.pseudo, p_ff_uid: form.ff_uid, p_email: email,
      p_game_rank: form.game_rank, p_message: form.message,
      p_is_togolese: form.is_togolese, p_speaks_ewe: form.is_togolese ? form.speaks_ewe : null,
      p_country: form.is_togolese ? 'Togo' : form.country, p_rules_accepted: form.accepted,
    })
    setBusy(false)
    if (rpcError) return setError(rpcError.message)
    setDone(true)
    // Email d'alerte à la guilde (sans bloquer le candidat si l'envoi échoue : la candidature est déjà enregistrée)
    Promise.resolve(supabase.functions.invoke('notify-new-application', { body: { application_id: data } })).catch(() => {})
  }

  const rulesText = rules.data?.body || FALLBACK_RULES

  // États particuliers : déjà membre / candidature déjà en attente
  if (isMember) {
    return (
      <div ref={ref}><Page size="sm">
        <PageHeader eyebrow="Candidature" title="Tu es déjà dans la guilde" lead="Ton compte est approuvé : il n'y a plus de candidature à envoyer." />
        <Button to="/profil" variant="dark">Voir mon profil</Button>
      </Page></div>
    )
  }
  if (session && mine.loading) return <Spinner className="flex-1" />
  if (!done && mine.data?.[0]?.status === 'pending') {
    return (
      <div ref={ref}><Page size="sm">
        <PageHeader eyebrow="Candidature" title="Candidature en cours" lead="Ta candidature a bien été reçue. Un admin l'examine et te répond par email." />
        <Card className="flex items-center gap-3"><Clock className="text-charo-orange" size={20} /> <span className="text-sm">Envoyée le {new Date(mine.data[0].created_at).toLocaleDateString('fr-FR')} · en attente de réponse</span></Card>
      </Page></div>
    )
  }

  return (
    <div ref={ref}>
      <Page size="sm">
        <PageHeader eyebrow="Candidature" title="Rejoindre la guilde" lead="Trois petites étapes. Un admin examine ta candidature et te répond par email." />

        {done ? (
          <Card pad="p-8" className="text-center">
            <CheckCircle2 size={44} className="mx-auto mb-4 text-green-600" />
            <h2 className="mb-2 font-display text-3xl">Candidature envoyée</h2>
            <p className="mx-auto mb-6 max-w-md text-muted">Merci {form.pseudo || ''} ! Les chefs de la guilde ont reçu ton dossier. Tu recevras une réponse à l’adresse <strong>{email}</strong>.</p>
            <Button to="/" variant="dark">Retour à l’accueil</Button>
          </Card>
        ) : (
          <Card pad="p-6 md:p-8">
            <Stepper step={step} />
            <form onSubmit={submit} noValidate>
              <div ref={panelRef} className="space-y-4">
                {step === 1 && (
                  <>
                    <Field label="Pseudo en jeu *"><input className="input" required maxLength={40} value={form.pseudo} onChange={(e) => set({ pseudo: e.target.value })} /></Field>
                    <Field label="ID Free Fire *"><input className="input" required maxLength={20} inputMode="numeric" value={form.ff_uid} onChange={(e) => set({ ff_uid: e.target.value })} /></Field>
                    <Field label="Email *" hint={accountEmail ? 'Email de ton compte connecté.' : 'Visible uniquement par les admins ; sert à te répondre.'}>
                      <input className="input" type="email" required maxLength={120} value={email} readOnly={!!accountEmail} onChange={(e) => set({ email: e.target.value })} />
                    </Field>
                    <Field label="Rang en jeu"><input className="input" maxLength={40} placeholder="Ex : Héroïque, Grand Maître…" value={form.game_rank} onChange={(e) => set({ game_rank: e.target.value })} /></Field>
                    <Field label="Parle-nous de toi"><textarea className="input" rows={3} maxLength={800} value={form.message} onChange={(e) => set({ message: e.target.value })} /></Field>
                    <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" value={form.website} onChange={(e) => set({ website: e.target.value })} />
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <p className="mb-3 text-lg font-bold">Es-tu togolais ?</p>
                      <div className="flex gap-3">
                        <Choice value current={form.is_togolese} onChange={(v) => set({ is_togolese: v, country: '' })}>Oui</Choice>
                        <Choice value={false} current={form.is_togolese} onChange={(v) => set({ is_togolese: v, speaks_ewe: null })}>Non</Choice>
                      </div>
                    </div>
                    {form.is_togolese === true && (
                      <div>
                        <p className="mb-3 text-lg font-bold">Parles-tu l’éwé ?</p>
                        <div className="flex gap-3">
                          <Choice value current={form.speaks_ewe} onChange={(v) => set({ speaks_ewe: v })}>Oui</Choice>
                          <Choice value={false} current={form.speaks_ewe} onChange={(v) => set({ speaks_ewe: v })}>Non</Choice>
                        </div>
                      </div>
                    )}
                    {form.is_togolese === false && (
                      <Field label="Quel est ton pays ? *">
                        <select className="input" value={form.country} onChange={(e) => set({ country: e.target.value })}>
                          <option value="">Choisir mon pays…</option>
                          <optgroup label="Pays proches">{countries.top.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}</optgroup>
                          <optgroup label="Tous les pays">{countries.rest.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}</optgroup>
                        </select>
                      </Field>
                    )}
                    <p className="text-xs text-muted">Ces informations sont visibles uniquement par les admins de la guilde.</p>
                  </>
                )}

                {step === 3 && (
                  <>
                    <p className="text-lg font-bold">Règlement de la guilde</p>
                    {rules.loading ? <Spinner /> : (
                      <div className="max-h-72 overflow-y-auto whitespace-pre-line rounded-2xl border border-line bg-surface-soft p-5 text-sm leading-relaxed" tabIndex={0}>{rulesText}</div>
                    )}
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-4 has-[:checked]:border-charo-orange has-[:checked]:bg-charo-orange/5">
                      <input type="checkbox" className="mt-1 h-5 w-5 accent-[#ff5a1f]" checked={form.accepted} onChange={(e) => set({ accepted: e.target.checked })} />
                      <span className="text-sm font-semibold">J’ai lu le règlement de la guilde MÉCHANTCHARO et je l’accepte.</span>
                    </label>
                  </>
                )}
              </div>

              {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <div className="mt-6 flex items-center justify-between gap-3">
                {step > 1 ? <button type="button" className="btn-outline !py-3" onClick={() => go(step - 1)}><ArrowLeft size={16} /> Retour</button> : <span />}
                {step < 3
                  ? <button type="button" className="btn-primary" onClick={next}>Suivant <ArrowRight size={16} /></button>
                  : <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma candidature'}</button>}
              </div>
            </form>
            <p className="mt-5 text-center text-xs text-muted">Étape {step} sur 3 · <Link className="underline" to="/">Annuler</Link></p>
          </Card>
        )}
      </Page>
    </div>
  )
}
