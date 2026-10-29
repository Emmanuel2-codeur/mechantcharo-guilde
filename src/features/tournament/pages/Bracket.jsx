import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw, Trophy } from 'lucide-react'
import BracketTree, { BracketDetails } from '@/features/tournament/components/BracketTree'
import { LinkTabs } from '@/shared/ui'
import { FINAL_TABS } from '@/app/config'
import { supabase } from '@/shared/lib/supabaseClient'

export default function Bracket() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    const { data, error: queryError } = await supabase.from('matches').select(`id,phase,round_label,bracket_position,match_type,leg,scheduled_at,scheduled_at_retour,status,status_override,score1,score2,damage1,damage2,score1_retour,score2_retour,damage1_retour,damage2_retour,winner_id,player1_id,player2_id,player1:profiles!matches_player1_id_fkey(id,pseudo,avatar_url),player2:profiles!matches_player2_id_fkey(id,pseudo,avatar_url)`).in('phase',['trente_deuxieme','seizieme','quart','demie','finale']).order('bracket_position',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true})
    if (queryError) setError(queryError.message)
    else setMatches(data || [])
    setLoading(false)
  }
  useEffect(() => { load(); const ch=supabase.channel('final-bracket-live').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).subscribe(); return ()=>supabase.removeChannel(ch) },[])
  const completed = useMemo(() => matches.filter(m => m.status === 'completed').length, [matches])
  return <div className="bracket-page">
    <main className="py-10 lg:py-16">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
        <LinkTabs items={FINAL_TABS} className="mb-6" />
        <div className="bracket-page-head">
          <div><span className="eyebrow mb-3"><Trophy size={13}/> Phase finale</span><h1 className="font-display text-5xl md:text-6xl text-ink">LE <span className="text-charo-orange">BRACKET</span></h1><p>32 finalistes · élimination directe · programmation manuelle · résultats en direct.</p></div>
          <div className="flex items-center gap-3"><div className="bracket-stat"><strong>{matches.length}</strong><span>matchs programmés</span></div><div className="bracket-stat"><strong>{completed}</strong><span>résultats validés</span></div><button onClick={load} className="btn-outline" disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Actualiser</button></div>
        </div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-5">{error}</div>}
        <div className="bracket-shell">
          {loading && !matches.length ? <div className="py-24 flex justify-center text-charo-orange"><LoaderCircle className="animate-spin"/></div> : <BracketTree matches={matches} onSelect={setSelected}/>} 
        </div>
        <p className="text-xs text-muted mt-4 text-center">Clique sur un match pour afficher ses détails : score, dégâts, règle, horaire et vainqueur.</p>
      </div>
    </main>
    {selected && <BracketDetails match={selected} onClose={() => setSelected(null)}/>}
  </div>
}
