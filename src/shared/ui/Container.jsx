import { cx } from '@/shared/lib/cx'

const SIZES = { sm: 'max-w-2xl', md: 'max-w-4xl', lg: 'max-w-5xl', xl: 'max-w-7xl' }

/** Largeur de contenu standard. `Page` ajoute en plus les marges verticales d'une page entière. */
export function Container({ size = 'xl', as: Tag = 'div', className, children }) {
  return <Tag className={cx('mx-auto px-5 lg:px-8', SIZES[size], className)}>{children}</Tag>
}

export function Page({ size = 'xl', className, children }) {
  return <Container as="main" size={size} className={cx('py-16 lg:py-24', className)}>{children}</Container>
}
