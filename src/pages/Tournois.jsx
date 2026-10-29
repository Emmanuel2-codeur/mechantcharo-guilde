import { Link } from 'react-router-dom'
import { ArrowRight, Swords } from 'lucide-react'
import { useRef } from 'react'
import { useReveal } from '../lib/useGsapEffects'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { TOURNAMENTS } from '../config'
import { useTournamentStatus } from '../lib/useTournamentStatus'

export default function Tournois() {
  const pageRef = useRef(null)
  const status = useTournamentStatus()
  useReveal(pageRef, [])

  return (
    <div className="min-h-screen" ref={pageRef}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <span data-reveal className="eyebrow mb-4">La compétition</span>
        <h1 data-reveal className="font-display text-5xl md:text-6xl text-ink-950 mb-3">Tournois</h1>
        <p data-reveal className="text-ink-600 max-w-xl mb-12">
          Tous les tournois organisés par la guilde MÉCHANTCHARO. Choisis-en un pour voir les matchs, le classement et le règlement.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {TOURNAMENTS.map((t) => (
            <Link key={t.slug} to={t.to} data-reveal="1" className="card p-8 group hover:border-charo-orange/60 transition-colors">
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-charo-orange/10 text-charo-orange flex items-center justify-center">
                  <Swords size={20} />
                </div>
                <span className={status.badgeClass}>{status.label}</span>
              </div>
              <h2 className="font-display text-3xl mb-2">{t.title}</h2>
              <p className="text-ink-600 mb-4">{t.text}</p>
              <p className="text-sm text-ink-600 mb-6">{t.game} · {t.format}</p>
              <span className="inline-flex items-center gap-2 font-semibold text-charo-orange">
                Ouvrir le tournoi <ArrowRight size={16} />
              </span>
            </Link>
          ))}

          <div data-reveal="2" className="rounded-3xl border-2 border-dashed border-ink-950/20 p-8 flex flex-col justify-center text-ink-600">
            <h2 className="font-display text-2xl text-ink-950 mb-2">Prochain tournoi</h2>
            <p>Les prochains tournois de la guilde seront annoncés ici et dans les annonces.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
