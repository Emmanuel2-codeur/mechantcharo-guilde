import { useAuth } from '@/features/auth/AuthContext'

/**
 * Niveau d'accès du visiteur courant :
 *  - visiteur : pas de compte → voit les membres, le Charo d'Or, les réalisations, les annonces
 *  - membre   : compte approuvé (ou admin) → voit en plus tournois, classements, calendrier
 * (La même règle existe côté base de données : fonction SQL is_member().)
 */
export function useAccess() {
  const { session, loading, isAdmin, isApproved } = useAuth()
  return { loading, isLoggedIn: !!session, isAdmin, isMember: !!session && (isApproved || isAdmin) }
}
