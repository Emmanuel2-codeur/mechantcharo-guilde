import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Crown, Award, Shield, Quote } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import { Page, Card, Avatar, Lightbox, Spinner, EmptyState } from '@/shared/ui'
import { roleLabel } from '@/features/guild/guild'

/** Profil public d'un membre : photo (cliquable pour l'agrandir), présentation, distinctions, anciennes guildes, titres. */
export default function Membre() {
  const { id } = useParams()
  const ref = useRef(null)
  const [zoom, setZoom] = useState(false)
  const member = useSupabaseQuery(() => supabase.from('guild_members').select('id, pseudo, guild_role, game_rank, avatar_url, bio, joined_at').eq('id', id).maybeSingle(), [id])
  const distinctions = useSupabaseQuery(() => supabase.from('member_distinctions').select('id, title, detail').eq('member_id', id).order('created_at', { ascending: false }), [id])
  const guilds = useSupabaseQuery(() => supabase.from('member_past_guilds').select('id, guild_name, period').eq('member_id', id).order('created_at', { ascending: false }), [id])
  const titles = useSupabaseQuery(() => supabase.from('charo_dor_records').select('id, value, charo_dor_titles(label)').eq('member_id', id).eq('is_current', true), [id])
  const badges = useSupabaseQuery(() => supabase.from('member_badges').select('id, badges(label)').eq('member_id', id), [id])
  useReveal(ref, [member.loading, distinctions.loading, guilds.loading])

  if (member.loading) return <Spinner className="flex-1" />
  const m = member.data
  if (!m) return <Page size="sm"><EmptyState title="Membre introuvable.">Ce profil n’existe pas ou n’est plus actif.</EmptyState></Page>

  const badgeCounts = (badges.data || []).reduce((acc, b) => { const l = b.badges?.label; if (l) acc[l] = (acc[l] || 0) + 1; return acc }, {})

  return (
    <div ref={ref}>
      <Page size="lg">
        <Link to="/guilde" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ink"><ArrowLeft size={16} /> Retour à la guilde</Link>

        <Card pad="p-8 md:p-10" data-reveal className="mb-8 flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <Avatar src={m.avatar_url} name={m.pseudo} size="xl" onClick={() => setZoom(true)} />
          <div className="min-w-0">
            <span className="eyebrow mb-3">{roleLabel(m.guild_role)}{m.game_rank ? ` · ${m.game_rank}` : ''}</span>
            <h1 className="font-display text-4xl text-ink md:text-5xl">{m.pseudo}</h1>
            {m.bio && <p className="mt-4 flex max-w-xl gap-2 text-muted"><Quote size={16} className="mt-1 shrink-0 text-charo-orange" /> {m.bio}</p>}
            {m.avatar_url && <p className="mt-3 text-xs text-muted">Clique sur la photo pour l’agrandir.</p>}
          </div>
        </Card>

        {(titles.data || []).length > 0 && (
          <section data-reveal className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl"><Crown className="text-charo-orange" size={22} /> Titres du Charo d’Or</h2>
            <div className="flex flex-wrap gap-3">
              {titles.data.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
                  {t.charo_dor_titles?.label}{t.value ? <span className="text-charo-orange">· {t.value}</span> : null}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <section data-reveal>
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl"><Award className="text-charo-orange" size={22} /> Distinctions</h2>
            {(distinctions.data || []).length === 0 && Object.keys(badgeCounts).length === 0 ? <EmptyState title="Aucune distinction pour l’instant." /> : (
              <Card pad="" className="divide-y divide-line">
                {Object.entries(badgeCounts).map(([label, n]) => (
                  <div key={label} className="px-5 py-3"><p className="font-bold">{label}{n > 1 ? ` ×${n}` : ''}</p><p className="text-xs text-muted">Badge de la guilde</p></div>
                ))}
                {(distinctions.data || []).map((d) => (
                  <div key={d.id} className="px-5 py-3"><p className="font-bold">{d.title}</p>{d.detail && <p className="text-sm text-muted">{d.detail}</p>}</div>
                ))}
              </Card>
            )}
          </section>
          <section data-reveal="1">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl"><Shield className="text-charo-orange" size={22} /> Guildes précédentes</h2>
            {(guilds.data || []).length === 0 ? <EmptyState title="Aucune guilde renseignée." /> : (
              <Card pad="" className="divide-y divide-line">
                {guilds.data.map((g) => <div key={g.id} className="px-5 py-3"><p className="font-bold">{g.guild_name}</p>{g.period && <p className="text-sm text-muted">{g.period}</p>}</div>)}
              </Card>
            )}
          </section>
        </div>
      </Page>
      <Lightbox src={zoom ? m.avatar_url : null} alt={`Photo de ${m.pseudo}`} onClose={() => setZoom(false)} />
    </div>
  )
}
