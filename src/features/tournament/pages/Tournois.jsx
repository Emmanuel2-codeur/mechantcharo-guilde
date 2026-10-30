import { ArrowRight, Swords } from 'lucide-react'
import { Lock } from 'lucide-react'
import { Page, PageHeader, Card } from '@/shared/ui'
import { useAccess } from '@/features/auth/useAccess'
import { TOURNAMENTS } from '@/app/config'
import { useTournamentStatus } from '@/features/tournament/useTournamentStatus'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { useRef } from 'react'

export default function Tournois() {
  const ref = useRef(null)
  const status = useTournamentStatus()
  const { isMember } = useAccess()
  useReveal(ref, [])

  return (
    <div ref={ref}>
      <Page>
        <PageHeader
          eyebrow="La compétition"
          title="Tournois"
          lead={isMember ? 'Tous les tournois organisés par la guilde MÉCHANTCHARO. Choisis-en un pour voir les matchs, le classement et le règlement.' : 'Les tournois organisés par la guilde MÉCHANTCHARO. Le détail (matchs, classement, règlement) est réservé aux membres.'}
        />
        <div className="grid gap-6 md:grid-cols-2">
          {TOURNAMENTS.map((t, i) => (
            <Card key={t.slug} {...(isMember ? { to: t.to } : {})} pad="p-8" data-reveal={i + 1} className={isMember ? 'group hover:border-charo-orange/60' : 'cursor-not-allowed'}>
              <div className="mb-5 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-charo-orange/10 text-charo-orange"><Swords size={20} /></span>
                <span className="badge-open">{status.label}</span>
              </div>
              <h2 className="mb-2 font-display text-3xl">{t.title}</h2>
              <p className="mb-4 text-muted">{t.text}</p>
              <p className="mb-6 text-sm text-muted">{t.game} · {t.format}</p>
              {isMember
                ? <span className="inline-flex items-center gap-2 font-semibold text-charo-orange">Ouvrir le tournoi <ArrowRight size={16} /></span>
                : <span className="inline-flex items-center gap-2 font-semibold text-muted"><Lock size={15} /> Réservé aux membres de la guilde</span>}
            </Card>
          ))}
          <div data-reveal="2" className="flex flex-col justify-center rounded-3xl border-2 border-dashed border-ink/20 p-8 text-muted">
            <h2 className="mb-2 font-display text-2xl text-ink">Prochain tournoi</h2>
            <p>Les prochains tournois de la guilde seront annoncés ici et dans les annonces.</p>
          </div>
        </div>
      </Page>
    </div>
  )
}
