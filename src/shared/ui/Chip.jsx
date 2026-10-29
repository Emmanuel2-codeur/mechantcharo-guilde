import { cx } from '@/shared/lib/cx'

/** Petite pastille au-dessus des titres (point orange animé). */
export default function Chip({ className, children, ...props }) {
  return <span className={cx('eyebrow', className)} {...props}>{children}</span>
}
