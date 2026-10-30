import { Lock } from 'lucide-react'
import { Page, Button, Card } from '@/shared/ui'
import { useAccess } from '@/features/auth/useAccess'

/** Message affiché à la place d'un contenu réservé aux membres. `inline` = sans mise en page de page entière. */
export default function LockedNotice({ inline = false, what = 'Cette partie' }) {
  const { isLoggedIn } = useAccess()
  const card = (
    <Card pad="p-10" className="mx-auto max-w-xl text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-charo-orange/10 text-charo-orange"><Lock size={26} /></span>
      <h2 className="mb-2 font-display text-3xl">Réservé aux membres</h2>
      <p className="mb-6 text-muted">
        {what} est visible uniquement par les membres de la guilde.{' '}
        {isLoggedIn ? 'Ton compte est en attente de validation par les admins.' : 'Connecte-toi, ou dépose ta candidature pour rejoindre la guilde.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {!isLoggedIn && <Button to="/connexion" variant="dark">Se connecter</Button>}
        <Button to="/rejoindre">Rejoindre la guilde</Button>
      </div>
    </Card>
  )
  return inline ? card : <Page>{card}</Page>
}
