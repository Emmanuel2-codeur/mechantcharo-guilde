import { NavLink } from 'react-router-dom'
import { cx } from '@/shared/lib/cx'

/** Onglets en pilules qui changent de page (ex. Matchs | Historique) : l'URL reste partageable. */
export default function LinkTabs({ items, className }) {
  return (
    <nav className={cx('flex flex-wrap items-center gap-2', className)}>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end
          className={({ isActive }) => cx(
            'rounded-full border px-5 py-2.5 text-sm font-bold transition-colors',
            isActive ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-ink hover:text-ink',
          )}
        >{it.label}</NavLink>
      ))}
    </nav>
  )
}
