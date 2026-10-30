import { cx } from '@/shared/lib/cx'

const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-lg', lg: 'h-24 w-24 text-3xl', xl: 'h-40 w-40 text-5xl' }

/** Photo de profil ronde, ou l'initiale du pseudo. Avec `onClick`, la photo devient cliquable (agrandissement). */
export default function Avatar({ src, name = '?', size = 'md', onClick, className }) {
  const cls = cx('relative shrink-0 overflow-hidden rounded-full bg-charo-gradient font-extrabold text-white flex items-center justify-center ring-2 ring-white shadow-card', SIZES[size], onClick && src && 'cursor-zoom-in transition-transform hover:scale-[1.03]', className)
  const inner = src ? <img src={src} alt={`Photo de ${name}`} className="h-full w-full object-cover" loading="lazy" /> : <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>
  return onClick && src
    ? <button type="button" onClick={onClick} className={cls} aria-label={`Agrandir la photo de ${name}`}>{inner}</button>
    : <span className={cls}>{inner}</span>
}
