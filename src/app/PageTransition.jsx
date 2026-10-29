import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 22, scale: 0.985, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -16, scale: 0.99, filter: 'blur(2px)' },
}

/** Transition douce entre deux pages. Utilisée une seule fois, par <Layout>. */
export default function PageTransition({ children }) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
