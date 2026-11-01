import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'

/** Règlement de la guilde affiché aux candidats (étape 3 du formulaire). Chaque publication crée une nouvelle version. */
export default function RulesAdmin({ run, setError }) {
  const rules = useSupabaseQuery(() => supabase.from('guild_rules').select('version, body, created_at').eq('is_current', true).maybeSingle(), [])
  const [text, setText] = useState(null)
  useEffect(() => { if (rules.error) setError(`Règlement : ${rules.error.message} (sql/guild/11_applications_v2.sql exécuté ?)`) }, [rules.error])

  const current = rules.data
  const value = text ?? current?.body ?? ''

  return (
    <div>
      <p className="mb-1 text-sm text-muted">
        {current ? `Version ${current.version} en vigueur depuis le ${new Date(current.created_at).toLocaleDateString('fr-FR')}.` : 'Aucun règlement publié.'}
        {' '}Chaque candidat accepte la version en vigueur au moment de l’envoi (date et version sont enregistrées).
      </p>
      <textarea className="input mt-3" rows={16} maxLength={8000} value={value} onChange={(e) => setText(e.target.value)} />
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary" disabled={value.trim().length < 20 || value === current?.body} onClick={async () => {
          if (!window.confirm('Publier cette nouvelle version du règlement ?')) return
          if (await run(supabase.rpc('publish_guild_rules', { p_body: value }), 'Nouvelle version du règlement publiée.')) { setText(null); rules.refetch() }
        }}>Publier une nouvelle version</button>
        <span className="text-xs text-muted">{value.length} / 8000 caractères</span>
      </div>
    </div>
  )
}
