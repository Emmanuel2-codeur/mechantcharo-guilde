import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../lib/gsap'

// Animation d'entrée commune à toutes les pages : le titre principal et la pastille au-dessus glissent en place.
// (L'accueil de la guilde et les éléments déjà animés via data-reveal ont leur propre animation.)
export default function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const t = setTimeout(() => {
      const targets = document.querySelectorAll('h1:not(.gh-title):not([data-reveal]), h1:not(.gh-title) ~ p:not([data-reveal]), .eyebrow:not([data-reveal])')
      if (targets.length) gsap.from(targets, { y: 26, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' })
    }, 180)
    return () => clearTimeout(t)
  }, [pathname])
  return null
}
