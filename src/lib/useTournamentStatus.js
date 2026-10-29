import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Statut calculé depuis les matchs : aucun match = à venir, des matchs restants = en cours, sinon terminé.
export function useTournamentStatus() {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('matches').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
    ]).then(([all, remaining]) => {
      if (alive) setCounts({ total: all.count || 0, remaining: remaining.count || 0 })
    })
    return () => { alive = false }
  }, [])

  if (!counts) return { label: 'Chargement', badgeClass: 'badge-open' }
  if (counts.total === 0) return { label: 'À venir', badgeClass: 'badge-open' }
  if (counts.remaining > 0) return { label: 'En cours', badgeClass: 'badge-open' }
  return { label: 'Terminé', badgeClass: 'badge-open' }
}
