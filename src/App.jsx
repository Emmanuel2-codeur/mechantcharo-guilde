import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/app/Layout'
import SplashScreen from '@/app/SplashScreen'
import { TOURNAMENT_BASE, LEGACY_REDIRECTS } from '@/app/config'
import AdminRoute from '@/features/auth/AdminRoute'
import RequireMember from '@/features/auth/RequireMember'
import Login from '@/features/auth/pages/Login'
import Profil from '@/features/auth/pages/Profil'
import Annonces from '@/features/announcements/pages/Annonces'
import GuildHome from '@/features/guild/pages/GuildHome'
import LaGuilde from '@/features/guild/pages/LaGuilde'
import CharoDor from '@/features/charodor/pages/CharoDor'
import Realisations from '@/features/guild/pages/Realisations'
import Membre from '@/features/guild/pages/Membre'
import Rejoindre from '@/features/guild/pages/Rejoindre'
import ClassementGuilde from '@/features/rankings/pages/ClassementGuilde'
import Tournois from '@/features/tournament/pages/Tournois'
import Landing from '@/features/tournament/pages/Landing'
import Matchs from '@/features/tournament/pages/Matchs'
import Groupes from '@/features/tournament/pages/Groupes'
import Bracket from '@/features/tournament/pages/Bracket'
import Finalistes from '@/features/tournament/pages/Finalistes'
import Reglement from '@/features/tournament/pages/Reglement'
import Classement from '@/features/tournament/pages/Classement'
import Historique from '@/features/tournament/pages/Historique'
import Admin from '@/features/admin/pages/Admin'

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('charos_splash_seen'))

  if (showSplash) {
    return <SplashScreen onFinish={() => { sessionStorage.setItem('charos_splash_seen', '1'); setShowSplash(false) }} />
  }

  const t = (path) => `${TOURNAMENT_BASE}/${path}`

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Guilde */}
        <Route index element={<GuildHome />} />
        <Route path="guilde" element={<LaGuilde />} />
        <Route path="charo-dor" element={<CharoDor />} />
        <Route path="rejoindre" element={<Rejoindre />} />
        <Route path="realisations" element={<Realisations />} />
        <Route path="membre/:id" element={<Membre />} />
        <Route path="annonces" element={<Annonces />} />

        {/* Tournois : liste visible par tous, détail réservé aux membres */}
        <Route path="tournois" element={<Tournois />} />

        {/* Réservé aux membres approuvés */}
        <Route element={<RequireMember />}>
          <Route path="classement-guilde" element={<ClassementGuilde />} />
          <Route path={TOURNAMENT_BASE} element={<Landing />} />
          <Route path={t('matchs')} element={<Matchs />} />
          <Route path={t('groupes')} element={<Groupes />} />
          <Route path={t('bracket')} element={<Bracket />} />
          <Route path={t('finalistes')} element={<Finalistes />} />
          <Route path={t('reglement')} element={<Reglement />} />
          <Route path={t('classement')} element={<Classement />} />
          <Route path={t('historique')} element={<Historique />} />
        </Route>

        {/* Compte et administration */}
        <Route path="connexion" element={<Login />} />
        <Route path="profil" element={<Profil />} />
        <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Anciennes URL conservées (liens partagés, notifications) */}
        {LEGACY_REDIRECTS.map((p) => <Route key={p} path={p} element={<Navigate to={t(p)} replace />} />)}
        <Route path="dashboard" element={<Navigate to={t('matchs')} replace />} />
        <Route path="membres" element={<Navigate to="/guilde?tab=membres" replace />} />
        <Route path="evenements" element={<Navigate to="/guilde?tab=evenements" replace />} />
        <Route path="honneur" element={<Navigate to="/classement-guilde" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
