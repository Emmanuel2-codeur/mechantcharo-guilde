import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useGuildHonor() {
  const [honor, setHonor] = useState(null)
  useEffect(() => {
    supabase.rpc('guild_honor').then(({ data }) => setHonor(data?.[0] || null))
  }, [])
  return honor
}
