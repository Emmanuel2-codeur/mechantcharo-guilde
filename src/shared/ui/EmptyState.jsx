import { cx } from '@/shared/lib/cx'

/** Message affiché quand une liste est vide (au lieu d'une zone blanche). */
export default function EmptyState({ title, children, className }) {
  return (
    <div className={cx('rounded-3xl border-2 border-dashed border-ink/15 p-8 text-center text-muted', className)}>
      {title && <p className="font-bold text-ink mb-1">{title}</p>}
      {children && <p className="text-sm">{children}</p>}
    </div>
  )
}
