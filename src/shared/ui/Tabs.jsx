import { cx } from '@/shared/lib/cx'

/** Onglets en pilules : <Tabs value={tab} onChange={setTab} items={[{ value, label }]} /> */
export default function Tabs({ items, value, onChange, className }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            'rounded-full border px-5 py-2.5 text-sm font-bold transition-colors',
            value === it.value ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-ink hover:text-ink',
          )}
        >
          {it.label}{it.badge ? <span className="ml-2 rounded-full bg-charo-orange px-1.5 text-[10px] text-white">{it.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
