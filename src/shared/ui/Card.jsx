import { Link } from 'react-router-dom'
import { cx } from '@/shared/lib/cx'

/** Carte blanche arrondie. Avec `to`, la carte entière devient un lien. */
export default function Card({ to, dark, pad = 'p-6', className, children, ...props }) {
  const cls = cx('card', pad, dark && '!bg-ink !text-white !border-ink', className)
  return to ? <Link to={to} className={cls} {...props}>{children}</Link> : <div className={cls} {...props}>{children}</div>
}
