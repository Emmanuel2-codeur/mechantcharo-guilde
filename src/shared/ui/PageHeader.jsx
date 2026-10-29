import Chip from './Chip'
import { cx } from '@/shared/lib/cx'

/** En-tête standard de page : pastille, titre (avec mot orange optionnel), texte d'intro, actions à droite. */
export default function PageHeader({ eyebrow, title, accent, lead, actions, className }) {
  return (
    <header className={cx('mb-10 lg:mb-14', className)}>
      {eyebrow && <Chip data-reveal className="mb-4">{eyebrow}</Chip>}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 data-reveal className="font-display text-5xl md:text-6xl text-ink">
            {title}{accent && <> <span className="text-charo-orange">{accent}</span></>}
          </h1>
          {lead && <p data-reveal className="mt-4 text-base md:text-lg leading-relaxed text-muted">{lead}</p>}
        </div>
        {actions && <div data-reveal className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  )
}
