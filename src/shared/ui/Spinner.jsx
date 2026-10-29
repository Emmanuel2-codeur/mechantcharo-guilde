import { Loader2 } from 'lucide-react'
import { cx } from '@/shared/lib/cx'

export default function Spinner({ label = 'Chargement…', className }) {
  return (
    <div className={cx('flex items-center justify-center gap-2 py-12 text-sm text-muted', className)} role="status">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}
