import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Swords, ShieldCheck, LogOut, UserRound, ArrowUpRight } from 'lucide-react'
import NotificationCenter from '@/features/notifications/NotificationCenter'
import BackButton from '@/app/BackButton'
import logo from '@/assets/logo.jpg'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccess } from '@/features/auth/useAccess'
import { GUILD_LINKS, TOURNAMENT_LINKS, TOURNAMENT_BASE } from '@/app/config'
import { signOut } from '@/shared/lib/supabaseClient'
import { gsap, prefersReducedMotion } from '@/shared/lib/gsap'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef(null)
  const { session, profile, isAdmin } = useAuth()
  const location = useLocation()
  const { isMember } = useAccess()
  const links = GUILD_LINKS.filter((l) => !l.members || isMember)
  const inTournament = location.pathname.startsWith(TOURNAMENT_BASE)
  const isGrouped = (l) => (l.also || []).some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
  const initial = (profile?.pseudo || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onResize = () => { if (window.innerWidth >= 1280) setOpen(false) }
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Le menu mobile bloque le scroll de la page et fait apparaître ses liens en cascade (GSAP).
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let ctx
    if (!prefersReducedMotion() && menuRef.current) {
      ctx = gsap.context(() => {
        gsap.from('.nav-m-item', { y: 18, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out' })
      }, menuRef)
    }
    return () => { document.body.style.overflow = previous; ctx?.revert() }
  }, [open])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${
      scrolled ? 'bg-white/85 border-line shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]' : 'bg-white/70 border-transparent'
    }`}>
      <div className={`max-w-7xl mx-auto px-5 xl:px-8 flex items-center justify-between gap-6 transition-all duration-300 ${scrolled ? 'h-[68px]' : 'h-20'}`}>
        {/* Marque */}
        <div className="flex items-center gap-3 shrink-0">
          {location.pathname !== '/' && <BackButton className="back-button-nav" />}
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative">
              <span className="absolute -inset-1 rounded-full bg-charo-gradient opacity-0 blur-md group-hover:opacity-60 transition-opacity" />
              <img src={logo} alt="Guilde MÉCHANTCHARO" className="relative w-10 h-10 rounded-full object-cover ring-2 ring-charo-orange" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[1.15rem] font-extrabold tracking-tight text-ink">
                MECHANT<span className="text-charo-orange">CHARO</span>
              </span>
              <span className="block mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">Guilde officielle</span>
            </span>
          </Link>
        </div>

        {/* Navigation (pilule) */}
        <nav className="hidden xl:flex items-center gap-1 rounded-full border border-line bg-surface-soft/80 p-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `relative whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold tracking-wide transition-all duration-200 ${
                  isActive || isGrouped(l)
                    ? 'bg-white text-charo-orange shadow-[0_2px_10px_-2px_rgba(15,23,42,0.18)]'
                    : 'text-muted hover:text-ink hover:bg-white/70'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Compte */}
        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          {session && <NotificationCenter />}
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-white hover:bg-charo-orange transition-colors">
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          {session ? (
            <>
              <Link to="/profil" className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-1.5 2xl:pr-4 text-sm font-semibold text-ink hover:border-charo-orange transition-colors">
                <span className="w-8 h-8 rounded-full bg-charo-gradient text-white flex items-center justify-center text-sm font-extrabold">{initial}</span>
                <span className="hidden 2xl:inline">{profile?.pseudo || 'Mon profil'}</span>
                {profile?.status === 'pending' && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">En attente</span>
                )}
              </Link>
              <button onClick={handleSignOut} className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-muted hover:text-red-600 hover:border-red-200 transition-colors" aria-label="Se déconnecter">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="rounded-full px-4 py-2.5 text-sm font-bold text-ink hover:text-charo-orange transition-colors">Se connecter</Link>
              <Link to="/rejoindre" className="inline-flex items-center gap-1.5 rounded-full bg-charo-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:brightness-110 active:scale-[0.97] transition-all">
                Rejoindre <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </div>

        <button
          className="xl:hidden w-11 h-11 rounded-full border border-line bg-white flex items-center justify-center text-ink"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sous-navigation du tournoi */}
      {inTournament && (
        <div className="border-t border-line/70 bg-gradient-to-r from-charo-orange/[0.07] via-transparent to-transparent">
          <div className="max-w-7xl mx-auto px-5 xl:px-8 h-12 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Link to={TOURNAMENT_BASE} className="shrink-0 inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-white mr-2">
              <Swords size={13} className="text-charo-orange2" /> Bataille des Charos
            </Link>
            {TOURNAMENT_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    isActive || isGrouped(l) ? 'bg-charo-orange/10 text-charo-orange' : 'text-muted hover:text-ink hover:bg-ink/5'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Menu mobile */}
      {open && (
        <div ref={menuRef} className="xl:hidden absolute left-0 right-0 top-full h-[calc(100svh-80px)] overflow-y-auto border-t border-line bg-white px-5 pt-6 pb-8 shadow-2xl">
          <nav className="flex flex-col">
            {links.map((l, i) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `nav-m-item flex items-center gap-4 border-b border-line/70 py-4 text-2xl font-extrabold tracking-tight ${isActive || isGrouped(l) ? 'text-charo-orange' : 'text-ink'}`
                }
              >
                <span className="w-6 text-xs font-bold text-muted">{String(i + 1).padStart(2, '0')}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-3">
            {session && <div className="nav-m-item"><NotificationCenter /></div>}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="nav-m-item inline-flex items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-bold text-white">
                <ShieldCheck size={16} /> Admin
              </Link>
            )}
            {session ? (
              <>
                <Link to="/profil" onClick={() => setOpen(false)} className="nav-m-item inline-flex items-center justify-center gap-2 rounded-full border border-line py-3.5 text-sm font-bold">
                  <UserRound size={16} className="text-charo-orange" /> {profile?.pseudo || 'Mon profil'}
                </Link>
                <button onClick={handleSignOut} className="nav-m-item inline-flex items-center justify-center gap-2 rounded-full border border-red-200 py-3.5 text-sm font-bold text-red-600">
                  <LogOut size={16} /> Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link to="/rejoindre" onClick={() => setOpen(false)} className="nav-m-item inline-flex items-center justify-center gap-2 rounded-full bg-charo-gradient py-3.5 text-sm font-bold text-white shadow-glow">
                  Rejoindre la guilde <ArrowUpRight size={16} />
                </Link>
                <Link to="/connexion" onClick={() => setOpen(false)} className="nav-m-item inline-flex items-center justify-center rounded-full border border-line py-3.5 text-sm font-bold">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
