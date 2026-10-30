import { Instagram, MessageCircle } from 'lucide-react'
import { SOCIALS } from '@/app/config'
import { cx } from '@/shared/lib/cx'

export function TikTokIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2h-3.2v13.1a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.7a6 6 0 0 0-.8-.1 5.9 5.9 0 1 0 5.9 5.9V9a8 8 0 0 0 4.6 1.5V7.3a4.8 4.8 0 0 1-.8-.6Z" />
    </svg>
  )
}
const ICONS = { instagram: Instagram, tiktok: TikTokIcon, whatsapp: MessageCircle }

/** Liens vers les réseaux de la guilde. variant="pill" (accueil : icône + nom) ou "round" (footer : icône seule). */
export default function SocialLinks({ variant = 'pill', className }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-3', className)}>
      {SOCIALS.map((s) => {
        const Icon = ICONS[s.id]
        return variant === 'round' ? (
          <a key={s.id} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-charo-orange hover:text-charo-orange">
            <Icon size={17} />
          </a>
        ) : (
          <a key={s.id} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
            className="gh-social inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/80 px-4 py-2.5 text-sm font-bold text-ink backdrop-blur transition-all hover:-translate-y-0.5 hover:border-charo-orange hover:text-charo-orange">
            <Icon size={16} /> {s.short || s.label}
          </a>
        )
      })}
    </div>
  )
}
