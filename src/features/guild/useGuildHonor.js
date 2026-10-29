import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'

/** Score et niveau d'honneur de la guilde (fonction SQL guild_honor). */
export function useGuildHonor() {
  const { data } = useSupabaseQuery(() => supabase.rpc('guild_honor'), [])
  return data?.[0] || null
}
