import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

// Révélation au scroll : tout élément portant data-reveal apparaît en glissant vers le haut.
// data-reveal="2" ajoute un décalage (2 × 0,1 s) pour échelonner des cartes voisines.
// Relancé quand `deps` change : seuls les nouveaux éléments (ex. chargés après une requête) sont animés.
export function useReveal(ref, deps = []) {
  const ctx = useRef(null)

  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return
    if (!ctx.current) ctx.current = gsap.context(() => {}, ref)
    ctx.current.add(() => {
      ref.current.querySelectorAll('[data-reveal]:not([data-rv])').forEach((el) => {
        el.setAttribute('data-rv', '1')
        gsap.from(el, {
          y: 36, opacity: 0, duration: 0.9, ease: 'power3.out',
          delay: (Number(el.dataset.reveal) || 0) * 0.1,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        })
      })
    })
  }, deps)

  useLayoutEffect(() => {
    const root = ref.current
    // Les pages arrivent avec une transition (framer-motion) : on recalcule les positions ensuite.
    const t = gsap.delayedCall(1, () => ScrollTrigger.refresh())
    return () => {
      t.kill()
      root?.querySelectorAll('[data-rv]').forEach((el) => el.removeAttribute('data-rv'))
      ctx.current?.revert()
      ctx.current = null
    }
  }, [])
}

// Compteurs animés : <span data-count="42" /> compte de 0 à 42 ; <div data-bar="60" /> remplit une jauge à 60 %.
export function useCountUp(ref, deps = []) {
  const ctx = useRef(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const reduce = prefersReducedMotion()
    if (!ctx.current) ctx.current = gsap.context(() => {}, ref)
    ctx.current.add(() => {
      ref.current.querySelectorAll('[data-count]:not([data-counted])').forEach((el) => {
        el.setAttribute('data-counted', '1')
        const target = Number(el.dataset.count) || 0
        if (reduce) { el.textContent = target; return }
        const o = { v: 0 }
        gsap.to(o, {
          v: target, duration: 1.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => { el.textContent = Math.round(o.v) },
        })
      })
      ref.current.querySelectorAll('[data-bar]:not([data-counted])').forEach((el) => {
        el.setAttribute('data-counted', '1')
        const pct = Math.min(100, Number(el.dataset.bar) || 0)
        if (reduce) { el.style.transform = `scaleX(${pct / 100})`; return }
        gsap.fromTo(el, { scaleX: 0 }, {
          scaleX: pct / 100, duration: 1.6, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        })
      })
    })
  }, deps)

  useLayoutEffect(() => () => {
    ref.current?.querySelectorAll('[data-counted]').forEach((el) => el.removeAttribute('data-counted'))
    ctx.current?.revert()
    ctx.current = null
  }, [])
}
