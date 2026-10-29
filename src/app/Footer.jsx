import { Link } from 'react-router-dom'
import { Instagram, MessageCircle, Swords } from 'lucide-react'
import logo from '@/assets/logo.jpg'
import { tPath } from '@/app/config'

function TikTokIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.5 4.2c.7 2 2 3.2 4.5 3.3v3.1c-1.7 0-3.2-.5-4.5-1.4v6.1a5.7 5.7 0 1 1-4.9-5.65v3.2a2.55 2.55 0 1 0 1.8 2.45V4.2h3.1Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white rounded-t-[2.5rem] mt-10 overflow-hidden relative">
      <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-charo-orange/20 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-5 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-full object-cover ring-2 ring-charo-orange/60" />
            <p className="font-display text-white font-extrabold tracking-tight">MÉCHANT<span className="text-charo-orange">CHARO</span></p>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Page officielle de la guilde MÉCHANTCHARO : tournois, annonces et vie de la guilde.
            Soyez Méchant.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-charo-orange mb-4">La Bataille des Charos</p>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to={tPath('/matchs')} className="hover:text-white transition-colors">Matchs programmés</Link></li>
            <li><Link to={tPath('/groupes')} className="hover:text-white transition-colors">Phase de poules</Link></li>
            <li><Link to={tPath('/bracket')} className="hover:text-white transition-colors">Arbre final</Link></li>
            <li><Link to={tPath('/classement')} className="hover:text-white transition-colors">Classement</Link></li>
            <li><Link to="/annonces" className="hover:text-white transition-colors">Annonces</Link></li>
            <li><Link to={tPath('/reglement')} className="hover:text-white transition-colors">Règlement complet</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-charo-orange mb-4">La guilde</p>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to="/" className="hover:text-white transition-colors">Accueil de la guilde</Link></li>
            <li><Link to="/tournois" className="hover:text-white transition-colors">Tous les tournois</Link></li>
            <li><Link to="/annonces" className="hover:text-white transition-colors">Annonces</Link></li>
            </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-charo-orange mb-4">Suivre la guilde</p>
          <div className="flex gap-3">
            <a href="https://www.instagram.com/mechantcharo1/" aria-label="Instagram" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-charo-orange hover:border-charo-orange transition-colors">
              <Instagram size={17} />
            </a>
            <a href="https://www.tiktok.com/@mechantcharo4" aria-label="TikTok" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-charo-orange hover:border-charo-orange transition-colors">
              <TikTokIcon />
            </a>
            <a href="https://wa.me/22890808584" aria-label="Communauté" className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-charo-orange hover:border-charo-orange transition-colors">
              <MessageCircle size={17} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© 2026 Guilde MÉCHANTCHARO. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5"><Swords size={13} /> Développé par Emmanuel-Dev</p>
        </div>
      </div>
    </footer>
  )
}
