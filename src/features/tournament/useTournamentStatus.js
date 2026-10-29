import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'

// Statut calculé depuis les matchs : aucun match = à venir, des matchs restants = en cours, sinon terminé.
export function useTournamentStatus() {
  const all = useSupabaseQuery(() => supabase.from('matches').select('id', { count: 'exact', head: true }), [])
  const left = useSupabaseQuery(() => supabase.from('matches').select('id', { count: 'exact', head: true }).neq('status', 'completed'), [])

  if (all.loading || left.loading) return { label: 'Chargement', key: 'loading' }
  if (!all.count) return { label: 'À venir', key: 'upcoming' }
  if (left.count > 0) return { label: 'En cours', key: 'live' }
  return { label: 'Terminé', key: 'done' }
}
