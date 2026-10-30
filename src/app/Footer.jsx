import { Link } from 'react-router-dom'
import { Swords } from 'lucide-react'
import SocialLinks from '@/features/guild/components/SocialLinks'
import logo from '@/assets/logo.jpg'
import { tPath } from '@/app/config'


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
            <SocialLinks variant="round" />
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
