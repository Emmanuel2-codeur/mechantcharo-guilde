import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, Lock } from 'lucide-react'
import logo from '@/assets/logo.jpg'
import { supabase } from '@/shared/lib/supabaseClient'
import { TOURNAMENTS } from '@/app/config'
import { useTournamentStatus } from '@/features/tournament/useTournamentStatus'
import { useGuildHonor } from '@/features/guild/useGuildHonor'
import { useAccess } from '@/features/auth/useAccess'
import SocialLinks from '@/features/guild/components/SocialLinks'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { levelProgress, kindLabel, fmtDateTime } from '@/features/guild/guild'
import { gsap, prefersReducedMotion } from '@/shared/lib/gsap'
import { useReveal, useCountUp } from '@/shared/hooks/useGsapEffects'
import '@/features/guild/pages/guildHome.css'

const MARQUEE = ['Soyez méchant', 'Guerres de guilde', 'Tournois', 'Guilde vs guilde', 'Classement']

export default function GuildHome() {
  const pageRef = useRef(null)
  const heroRef = useRef(null)
  const marqueeRef = useRef(null)
  const status = useTournamentStatus()
  const honor = useGuildHonor()
  const featured = TOURNAMENTS[0]
  const { isMember } = useAccess()
  const rank = useSupabaseQuery(() => supabase.from('guild_rank_history').select('rank, scope').eq('is_current', true).limit(1), []).data?.[0]
  const TournamentCard = isMember ? Link : 'div'
  const champion = useSupabaseQuery(() => supabase.from('charo_dor_records').select('value, season, guild_members(pseudo), charo_dor_titles!inner(code)').eq('is_current', true).eq('charo_dor_titles.code', 'saison').limit(1), []).data?.[0]
  const [announcements, setAnnouncements] = useState([])
  const [memberCount, setMemberCount] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)

  useEffect(() => {
    supabase.from('announcements').select('id, title, body, created_at').eq('published', true)
      .order('created_at', { ascending: false }).limit(3).then(({ data }) => setAnnouncements(data || []))
    supabase.from('guild_members').select('id', { count: 'exact', head: true }).eq('is_active', true)
      .then(({ count }) => setMemberCount(count || 0))
    supabase.from('guild_events').select('kind, title, starts_at').gte('starts_at', new Date().toISOString())
      .order('starts_at').limit(1).then(({ data }) => setNextEvent(data?.[0] || null))
  }, [])

  // ── Animations du hero : entrée du logo et du texte, flottement, parallaxe souris/scroll, boutons magnétiques
  useLayoutEffect(() => {
    const root = heroRef.current
    if (!root || prefersReducedMotion()) return
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = (s) => root.querySelector(s)
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      tl.from(q('.gh-logo img'), { opacity: 0, scale: 1.12, x: 90, duration: 1.8, ease: 'expo.out' }, 0)
        .from(q('.gh-glow'), { opacity: 0, scale: 0.6, duration: 1.8 }, 0.1)
        .from(q('.gh-chip'), { opacity: 0, y: 16, duration: 0.7 }, 0.2)
        .from(root.querySelectorAll('.gh-line > span'), { yPercent: 115, duration: 1.1, stagger: 0.12 }, 0.3)
        .from(root.querySelectorAll('.gh-fade'), { opacity: 0, y: 24, duration: 0.8, stagger: 0.1 }, 0.9)

      gsap.to(q('.gh-logo-float'), { y: -14, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.to(q('.gh-logo-scroll'), {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to(q('.gh-inner'), {
        y: -50, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: root, start: '40% top', end: 'bottom top', scrub: true },
      })

      const cleanups = []
      if (window.matchMedia('(hover: hover)').matches) {
        const px = gsap.quickTo(q('.gh-logo-par'), 'x', { duration: 1.2, ease: 'power3' })
        const py = gsap.quickTo(q('.gh-logo-par'), 'y', { duration: 1.2, ease: 'power3' })
        const onMove = (e) => {
          const r = root.getBoundingClientRect()
          px(((e.clientX - r.left) / r.width - 0.5) * -40)
          py(((e.clientY - r.top) / r.height - 0.5) * -30)
        }
        root.addEventListener('mousemove', onMove)
        cleanups.push(() => root.removeEventListener('mousemove', onMove))

        root.querySelectorAll('[data-magnetic]').forEach((el) => {
          const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
          const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })
          const move = (e) => {
            const r = el.getBoundingClientRect()
            mx((e.clientX - (r.left + r.width / 2)) * 0.28)
            my((e.clientY - (r.top + r.height / 2)) * 0.28)
          }
          const leave = () => { mx(0); my(0) }
          el.addEventListener('mousemove', move)
          el.addEventListener('mouseleave', leave)
          cleanups.push(() => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) })
        })
      }
      return () => cleanups.forEach((fn) => fn())
    }, root)

    return () => mm.revert()
  }, [])

  // ── Bande défilante infinie
  useLayoutEffect(() => {
    const el = marqueeRef.current
    if (!el || prefersReducedMotion()) return
    const tween = gsap.to(el, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 })
    return () => tween.kill()
  }, [])

  useReveal(pageRef, [announcements.length, !!honor, memberCount, !!nextEvent])
  useCountUp(pageRef, [memberCount, !!honor])

  const lvl = honor ? levelProgress(honor.score) : null
  const group = MARQUEE.flatMap((w) => [<span key={w}>{w}</span>, <em key={`${w}-s`}>✦</em>])

  return (
    <div className="gh" ref={pageRef}>

      {/* ───── Hero ───── */}
      <section className="gh-hero" ref={heroRef}>
        <div className="gh-grid" />
        <div className="gh-glow" />
        <div className="gh-logo" aria-hidden="true">
          <div className="gh-logo-scroll"><div className="gh-logo-par"><div className="gh-logo-float">
            <img src={logo} alt="" />
          </div></div></div>
        </div>

        <div className="gh-content">
          <div className="gh-inner">
            <span className="gh-chip"><i className="gh-dot" /> Guilde officielle · Free Fire</span>
            <h1 className="gh-title">
              <span className="gh-line gh-hello"><span>Bienvenue chez les</span></span>
              <span className="gh-line gh-big"><span>MÉCHANTS</span></span>
              <span className="gh-line gh-big gh-outline"><span>CHARO</span></span>
            </h1>
            <p className="gh-lead gh-fade">
              Une guilde qui joue pour gagner. Tournois, guerres de guilde, titres du Charo d’Or et réalisations : tout se passe ici.
            </p>
            <div className="gh-actions gh-fade">
              <Link to="/rejoindre" className="gh-btn gh-btn-dark" data-magnetic>Rejoindre la guilde <ArrowUpRight size={18} /></Link>
              <Link to="/tournois" className="gh-btn gh-btn-ghost" data-magnetic>Voir les tournois</Link>
            </div>

            <div className="gh-socials gh-fade">
              <p className="gh-social-label">Suis la guilde</p>
              <SocialLinks />
            </div>

            {(memberCount > 0 || honor || rank) && (
              <div className="gh-stats gh-fade">
                {rank && <div className="gh-stat"><strong>N°{rank.rank}</strong><span>au {rank.scope}</span></div>}
                {memberCount > 0 && <div className="gh-stat"><strong data-count={memberCount}>0</strong><span>membres actifs</span></div>}
                {honor && <div className="gh-stat"><strong data-count={honor.wins}>0</strong><span>victoires</span></div>}
                {honor && <div className="gh-stat"><strong>{honor.level}</strong><span>niveau d’honneur</span></div>}
              </div>
            )}
          </div>
        </div>
        <div className="gh-scroll gh-fade"><i /> Défiler</div>
      </section>

      {/* ───── Bande défilante ───── */}
      <div className="gh-marquee" aria-hidden="true">
        <div className="gh-track" ref={marqueeRef}><div>{group}{group}</div><div>{group}{group}</div></div>
      </div>

      {/* ───── La guilde en ce moment ───── */}
      <section className="gh-section">
        <div className="gh-wrap">
          <p className="gh-eyebrow" data-reveal>En ce moment</p>
          <h2 className="gh-h2" data-reveal>La guilde en action.</h2>
          <div className="gh-bento">
            <TournamentCard {...(isMember ? { to: featured.to } : {})} className="gh-card gh-card-tall gh-card-dark" data-reveal>
              <div>
                <span className="gh-status"><i className="gh-dot" /> {status.label}</span>
                <h3 style={{ marginTop: '1.5rem' }}>{featured.title}</h3>
                <p style={{ maxWidth: '30rem' }}>{featured.text}</p>
                <p style={{ marginTop: '.75rem', fontSize: '.9rem' }}>{featured.game} · {featured.format}</p>
              </div>
              <span className="gh-more">{isMember ? <>Entrer dans le tournoi <ArrowRight size={16} /></> : <><Lock size={15} /> Réservé aux membres</>}</span>
            </TournamentCard>

            {isMember ? (
              <Link to="/guilde?tab=evenements" className="gh-card" data-reveal="1">
                <div>
                  <span className="gh-label">Prochain rendez-vous</span>
                  {nextEvent ? (
                    <>
                      <h3 style={{ fontSize: '1.5rem' }}>{nextEvent.title}</h3>
                      <p>{kindLabel(nextEvent.kind)} · {fmtDateTime(nextEvent.starts_at)}</p>
                    </>
                  ) : <p style={{ marginTop: '.75rem' }}>Aucun événement programmé pour le moment.</p>}
                </div>
                <span className="gh-more">Voir le calendrier <ArrowUpRight size={16} /></span>
              </Link>
            ) : (
              <Link to="/realisations" className="gh-card" data-reveal="1">
                <div>
                  <span className="gh-label">Nos réalisations</span>
                  {rank
                    ? <p className="gh-bignum" style={{ color: 'var(--ink)', marginTop: '.5rem' }}>N°{rank.rank}</p>
                    : <h3 style={{ fontSize: '1.5rem' }}>Notre palmarès</h3>}
                  <p>{rank ? `de la guilde au ${rank.scope}` : 'Classement, victoires en GVG et distinctions.'}</p>
                </div>
                <span className="gh-more">Voir les réalisations <ArrowUpRight size={16} /></span>
              </Link>
            )}

            <Link to="/guilde?tab=membres" className="gh-card" data-reveal="2">
              <div>
                <span className="gh-label">La famille</span>
                {memberCount > 0
                  ? <p className="gh-bignum" style={{ color: 'var(--ink)', marginTop: '.5rem' }}><span data-count={memberCount}>0</span></p>
                  : <h3 style={{ fontSize: '1.5rem' }}>Les membres</h3>}
                <p>{memberCount > 0 ? 'membres actifs dans la guilde' : 'Découvre ceux qui portent les couleurs.'}</p>
              </div>
              <span className="gh-more">Voir les membres <ArrowUpRight size={16} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Charo d'Or ───── */}
      {champion && (
        <section className="gh-section" style={{ paddingBottom: 0 }}>
          <div className="gh-wrap">
            <Link to="/charo-dor" className="gh-card gh-card-dark" data-reveal style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <span className="gh-label">Charo d’Or · Meilleur joueur de la saison</span>
                <h3 style={{ marginBottom: 0 }}>{champion.guild_members?.pseudo}</h3>
                {champion.season && <p style={{ marginTop: '.4rem' }}>{champion.season}</p>}
              </div>
              <span className="gh-more" style={{ marginLeft: 'auto' }}>Voir tous les titres <ArrowRight size={16} /></span>
            </Link>
          </div>
        </section>
      )}

      {/* ───── Honneur ───── */}
      {honor && lvl && (
        <section className="gh-honor">
          <div className="gh-wrap gh-honor-grid">
            <div data-reveal>
              <p className="gh-eyebrow">Honneur de la guilde</p>
              <p className="gh-level">{honor.level}</p>
              <div className="gh-bar"><div data-bar={lvl.pct} /></div>
              <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.9rem' }}>
                {lvl.next ? `${lvl.next.min - honor.score} points avant le niveau ${lvl.next.name}` : 'Niveau maximum atteint'}
              </p>
            </div>
            <div data-reveal="2">
              <p className="gh-score"><span data-count={honor.score}>0</span></p>
              <p style={{ color: 'rgba(255,255,255,.65)', margin: '.5rem 0 2rem' }}>points d’honneur · {honor.participation_pct} % de participation</p>
              <Link to="/classement-guilde" className="gh-btn gh-btn-light">Voir le classement <ArrowUpRight size={18} /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ───── Annonces ───── */}
      {announcements.length > 0 && (
        <section className="gh-section">
          <div className="gh-wrap">
            <p className="gh-eyebrow" data-reveal>Actualités</p>
            <h2 className="gh-h2" data-reveal>Dernières annonces.</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {announcements.map((a, i) => (
                <Link key={a.id} to="/annonces" className="gh-news" data-reveal={i}>
                  <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.5rem' }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '.5rem' }}>{a.title}</h3>
                  <p className="line-clamp-3" style={{ color: 'var(--muted)', fontSize: '.92rem' }}>{a.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── Appel final ───── */}
      <section className="gh-section" style={{ paddingTop: announcements.length ? 0 : undefined }}>
        <div className="gh-wrap">
          <div className="gh-cta" data-reveal>
            <h2>Prêt à devenir méchant ?</h2>
            <p>Dépose ta candidature en deux minutes. Un admin te répond par email.</p>
            <Link to="/rejoindre" className="gh-btn gh-btn-light" data-magnetic>Rejoindre la guilde <ArrowUpRight size={18} /></Link>
          </div>
        </div>
      </section>

    </div>
  )
}
