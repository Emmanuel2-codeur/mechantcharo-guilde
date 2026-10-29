import Spinner from './Spinner'
import EmptyState from './EmptyState'

/**
 * Affiche l'état d'une requête (useSupabaseQuery) : chargement, erreur, vide, ou le contenu.
 *   <QueryState query={q} empty={<EmptyState title="Rien ici" />}>{(rows) => …}</QueryState>
 */
export default function QueryState({ query, empty, isEmpty, loadingLabel, children }) {
  if (query.loading) return <Spinner label={loadingLabel} />
  if (query.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Impossible de charger les données ({query.error.message || 'erreur'}).{' '}
        <button className="font-bold underline" onClick={query.refetch}>Réessayer</button>
      </div>
    )
  }
  const emptyNow = isEmpty ? isEmpty(query.data) : Array.isArray(query.data) && query.data.length === 0
  if (emptyNow) return empty ?? <EmptyState title="Rien à afficher pour l’instant." />
  return children(query.data)
}
