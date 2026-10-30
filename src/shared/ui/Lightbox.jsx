import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/** Affiche une image en grand par-dessus la page. Se ferme au clic, avec Échap ou avec la croix. */
export default function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [src, onClose])

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true">
          <button className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          <motion.img src={src} alt={alt} className="max-h-[88vh] max-w-full rounded-3xl object-contain shadow-2xl"
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }} onClick={(e) => e.stopPropagation()} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
