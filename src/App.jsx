import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import GuildHome from './pages/GuildHome'
import Tournois from './pages/Tournois'
import Membres from './pages/Membres'
import Evenements from './pages/Evenements'
import ClassementGuilde from './pages/ClassementGuilde'
import Rejoindre from './pages/Rejoindre'
import Groupes from './pages/Groupes'
import Bracket from './pages/Bracket'
import Reglement from './pages/Reglement'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Classement from './pages/Classement'
import Historique from './pages/Historique'
import Profil from './pages/Profil'
import AdminRoute from './components/AdminRoute'
import Matchs from './pages/Matchs'
import Finalistes from './pages/Finalistes'
import Annonces from './pages/Annonces'
import BackToTop from './components/BackToTop'
import SplashScreen from './components/SplashScreen'
import PageTransition from './components/PageTransition'
import RouteEffects from './components/RouteEffects'
import { TOURNAMENT_BASE, LEGACY_REDIRECTS } from './config'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('charos_splash_seen'))
  const location = useLocation()

  const finishSplash = () => {
    sessionStorage.setItem('charos_splash_seen', '1')
    setShowSplash(false)
  }

  if (showSplash) {
    return <SplashScreen onFinish={finishSplash} />
  }

  return (
    <>
      <RouteEffects />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><GuildHome /></PageTransition>} />
          <Route path="/membres" element={<PageTransition><Membres /></PageTransition>} />
          <Route path="/evenements" element={<PageTransition><Evenements /></PageTransition>} />
          <Route path="/classement-guilde" element={<PageTransition><ClassementGuilde /></PageTransition>} />
          <Route path="/honneur" element={<Navigate to="/classement-guilde" replace />} />
          <Route path="/rejoindre" element={<PageTransition><Rejoindre /></PageTransition>} />
          <Route path="/tournois" element={<PageTransition><Tournois /></PageTransition>} />
          <Route path={TOURNAMENT_BASE} element={<PageTransition><Landing /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/matchs`} element={<PageTransition><Matchs /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/groupes`} element={<PageTransition><Groupes /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/bracket`} element={<PageTransition><Bracket /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/finalistes`} element={<PageTransition><Finalistes /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/reglement`} element={<PageTransition><Reglement /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/classement`} element={<PageTransition><Classement /></PageTransition>} />
          <Route path={`${TOURNAMENT_BASE}/historique`} element={<PageTransition><Historique /></PageTransition>} />
          {/* Anciennes URLs -> nouvelles (liens partagés, notifications) */}
          {LEGACY_REDIRECTS.map((p) => (
            <Route key={p} path={`/${p}`} element={<Navigate to={`${TOURNAMENT_BASE}/${p}`} replace />} />
          ))}
          <Route path="/dashboard" element={<Navigate to={`${TOURNAMENT_BASE}/matchs`} replace />} />
          <Route path="/connexion" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/profil" element={<PageTransition><Profil /></PageTransition>} />
                    <Route path="/annonces" element={<PageTransition><Annonces /></PageTransition>} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <PageTransition><Admin /></PageTransition>
              </AdminRoute>
            }
          />
        </Routes>
      </AnimatePresence>
      <BackToTop />
    </>
  )
}
