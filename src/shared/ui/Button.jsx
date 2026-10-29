import { Link } from 'react-router-dom'
import { cx } from '@/shared/lib/cx'

const VARIANTS = { primary: 'btn-primary', outline: 'btn-outline', dark: 'btn-dark', light: 'btn-light' }

/** Bouton unique du site : <Button to="/x">, <Button href="…"> ou <Button onClick>. */
export default function Button({ to, href, variant = 'primary', size = 'md', icon: Icon, className, children, ...props }) {
  const cls = cx(VARIANTS[variant], size === 'sm' && '!px-4 !py-2 text-sm', className)
  const content = <>{Icon && <Icon size={16} />}{children}</>
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>
  if (href) return <a href={href} className={cls} {...props}>{content}</a>
  return <button className={cls} {...props}>{content}</button>
}
