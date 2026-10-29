import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'
import BackToTop from './BackToTop'
import PageTransition from './PageTransition'
import RouteEffects from './RouteEffects'

/**
 * Enveloppe unique de toutes les pages : fond commun, navbar, transition, footer.
 * Les pages n'ont donc plus à rendre <Navbar /> ni <Footer />.
 */
export default function Layout() {
  const { pathname } = useLocation()
  const outlet = useOutlet()

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <div className="site-backdrop" aria-hidden="true" />
      <Navbar />
      <AnimatePresence mode="wait">
        <PageTransition key={pathname}>{outlet}</PageTransition>
      </AnimatePresence>
      <Footer />
      <BackToTop />
      <RouteEffects />
    </div>
  )
}
