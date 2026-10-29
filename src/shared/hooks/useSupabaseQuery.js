import { useCallback, useEffect, useState } from 'react'

/**
 * Charge des données Supabase avec chargement / erreur / rafraîchissement gérés au même endroit.
 *
 *   const { data, loading, error, refetch } = useSupabaseQuery(
 *     () => supabase.from('guild_members').select('*').eq('is_active', true),
 *     [],                       // dépendances : la requête est relancée quand elles changent
 *   )
 *
 * `queryFn` doit RENVOYER la requête (select/rpc…) : le hook l'exécute et lit { data, error, count }.
 */
export function useSupabaseQuery(queryFn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, count: null, error: null, loading: enabled })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) { setState((s) => ({ ...s, loading: false })); return undefined }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    Promise.resolve(queryFn())
      .then((res) => {
        if (!alive) return
        if (res?.error) setState({ data: null, count: null, error: res.error, loading: false })
        else setState({ data: res?.data ?? null, count: res?.count ?? null, error: null, loading: false })
      })
      .catch((error) => { if (alive) setState({ data: null, count: null, error, loading: false }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, refetch }
}
