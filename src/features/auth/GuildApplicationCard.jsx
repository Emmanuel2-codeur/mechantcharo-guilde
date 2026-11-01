import { Clock, CheckCircle2, XCircle, UserPlus } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, Button, Spinner } from '@/shared/ui'

const STATE = {
  pending: { icon: Clock, title: 'Candidature en attente', text: 'Ta candidature a bien été reçue. Un admin l’examine et te répond par email.', tone: 'text-amber-600 bg-amber-50' },
  accepted: { icon: CheckCircle2, title: 'Candidature acceptée', text: 'Bienvenue dans la guilde ! Un admin te contacte pour la suite.', tone: 'text-green-700 bg-green-50' },
  rejected: { icon: XCircle, title: 'Candidature refusée', text: 'Ta candidature n’a pas été retenue pour le moment.', tone: 'text-red-700 bg-red-50' },
}

/** « Ma candidature à la guilde » : statut de la candidature, ou bouton pour la déposer (comptes pas encore approuvés). */
export default function GuildApplicationCard() {
  const { session } = useAuth()
  const apps = useSupabaseQuery(
    () => supabase.from('guild_applications').select('id, status, admin_note, created_at').eq('profile_id', session.user.id).order('created_at', { ascending: false }).limit(1),
    [session?.user?.id], { enabled: !!session },
  )
  if (apps.loading) return <Spinner />
  if (apps.error) return null // table non migrée : on n'affiche rien plutôt qu'une erreur
  const app = apps.data?.[0]
  const st = app && STATE[app.status]

  return (
    <Card pad="p-6 md:p-8">
      <h2 className="mb-4 font-display text-2xl">Ma candidature à la guilde</h2>
      {st ? (
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${st.tone}`}><st.icon size={20} /></span>
          <div>
            <p className="font-bold">{st.title}</p>
            <p className="text-sm text-muted">{st.text}</p>
            {app.admin_note && <p className="mt-2 text-sm"><span className="font-semibold">Message de l’équipe :</span> {app.admin_note}</p>}
            {app.status === 'rejected' && <Button to="/rejoindre" variant="outline" size="sm" className="mt-3">Déposer une nouvelle candidature</Button>}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-muted">Tu n’as pas encore déposé de candidature. Remplis le formulaire (3 étapes) pour demander à rejoindre la guilde.</p>
          <Button to="/rejoindre" icon={UserPlus}>Déposer ma candidature</Button>
        </div>
      )}
    </Card>
  )
}
