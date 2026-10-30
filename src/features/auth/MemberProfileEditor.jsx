import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Trash2, Plus, ExternalLink } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { uploadPublicFile } from '@/shared/lib/storage'
import { useSupabaseQuery } from '@/shared/hooks/useSupabaseQuery'
import { useAuth } from '@/features/auth/AuthContext'
import { Avatar, Card, Spinner } from '@/shared/ui'

const MAX_PHOTO = 5 * 1024 * 1024

/** Espace « Mon profil de guilde » : photo, présentation, distinctions et guildes précédentes (membres approuvés). */
export default function MemberProfileEditor() {
  const { session, refreshProfile } = useAuth()
  const me = useSupabaseQuery(() => supabase.from('guild_members').select('id, pseudo, bio, avatar_url').eq('profile_id', session.user.id).maybeSingle(), [session?.user?.id], { enabled: !!session })
  const memberId = me.data?.id
  const dist = useSupabaseQuery(() => supabase.from('member_distinctions').select('id, title, detail').eq('member_id', memberId).order('created_at'), [memberId], { enabled: !!memberId })
  const guilds = useSupabaseQuery(() => supabase.from('member_past_guilds').select('id, guild_name, period').eq('member_id', memberId).order('created_at'), [memberId], { enabled: !!memberId })

  const fileRef = useRef(null)
  const [bio, setBio] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [newDist, setNewDist] = useState({ title: '', detail: '' })
  const [newGuild, setNewGuild] = useState({ guild_name: '', period: '' })

  if (me.loading) return <Spinner />
  if (!me.data) return null // pas encore de fiche membre (compte non approuvé)
  const m = me.data
  const bioValue = bio ?? m.bio ?? ''
  const say = (type, text) => setMsg({ type, text })

  const saveBio = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('update_my_member_profile', { p_bio: bioValue })
    setBusy(false)
    error ? say('error', error.message) : say('ok', 'Présentation enregistrée.')
    me.refetch()
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return say('error', 'Choisis une image (JPG, PNG, WebP).')
    if (file.size > MAX_PHOTO) return say('error', 'Photo trop lourde (5 Mo maximum).')
    setBusy(true)
    const { data, error } = await uploadPublicFile(file, 'avatars')
    if (error) { setBusy(false); return say('error', error.message) }
    const res = await supabase.rpc('update_my_member_profile', { p_bio: bioValue, p_avatar_url: data.url })
    setBusy(false)
    if (res.error) return say('error', res.error.message)
    say('ok', 'Photo mise à jour.'); me.refetch(); refreshProfile?.()
  }

  const removePhoto = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('update_my_member_profile', { p_bio: bioValue, p_remove_avatar: true })
    setBusy(false)
    error ? say('error', error.message) : (say('ok', 'Photo retirée.'), me.refetch(), refreshProfile?.())
  }

  const add = async (table, row, reset, list) => {
    const { error } = await supabase.from(table).insert({ ...row, member_id: memberId })
    if (error) return say('error', error.message)
    reset(); list.refetch(); say('ok', 'Ajouté.')
  }
  const del = async (table, id, list) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    error ? say('error', error.message) : list.refetch()
  }

  return (
    <Card pad="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Mon profil de guilde</h2>
        <Link to={`/membre/${m.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-charo-orange hover:underline">Voir mon profil public <ExternalLink size={14} /></Link>
      </div>

      {msg.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</p>}

      <div className="mb-8 flex flex-wrap items-center gap-5">
        <Avatar src={m.avatar_url} name={m.pseudo} size="lg" />
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhoto} />
          <button className="btn-outline !py-2 text-sm" disabled={busy} onClick={() => fileRef.current?.click()}><Camera size={15} /> {m.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}</button>
          {m.avatar_url && <button className="ml-2 text-sm font-bold text-muted hover:text-red-600" disabled={busy} onClick={removePhoto}>Retirer</button>}
          <p className="text-xs text-muted">JPG, PNG ou WebP · 5 Mo max. Les visiteurs pourront l’agrandir.</p>
        </div>
      </div>

      <label className="mb-8 block">
        <span className="mb-2 block text-sm font-bold">Ma présentation</span>
        <textarea className="input" rows={3} maxLength={400} value={bioValue} onChange={(e) => setBio(e.target.value)} placeholder="Ton style de jeu, ton rôle dans la guilde…" />
        <button className="btn-primary mt-3 !py-2 text-sm" disabled={busy} onClick={saveBio} type="button">Enregistrer</button>
      </label>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="mb-3 font-bold">Mes distinctions</h3>
          <ul className="mb-3 space-y-2">
            {(dist.data || []).map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span><strong>{d.title}</strong>{d.detail ? <span className="text-muted"> · {d.detail}</span> : null}</span>
                <button aria-label="Supprimer" className="text-muted hover:text-red-600" onClick={() => del('member_distinctions', d.id, dist)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <input className="input" maxLength={80} placeholder="Distinction (ex. Champion du tournoi X)" value={newDist.title} onChange={(e) => setNewDist({ ...newDist, title: e.target.value })} />
            <input className="input" maxLength={200} placeholder="Détail (optionnel)" value={newDist.detail} onChange={(e) => setNewDist({ ...newDist, detail: e.target.value })} />
            <button className="btn-outline !py-2 text-sm" disabled={newDist.title.trim().length < 2} onClick={() => add('member_distinctions', { title: newDist.title.trim(), detail: newDist.detail.trim() || null }, () => setNewDist({ title: '', detail: '' }), dist)}><Plus size={14} /> Ajouter</button>
          </div>
        </section>
        <section>
          <h3 className="mb-3 font-bold">Guildes précédentes</h3>
          <ul className="mb-3 space-y-2">
            {(guilds.data || []).map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span><strong>{g.guild_name}</strong>{g.period ? <span className="text-muted"> · {g.period}</span> : null}</span>
                <button aria-label="Supprimer" className="text-muted hover:text-red-600" onClick={() => del('member_past_guilds', g.id, guilds)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <input className="input" maxLength={60} placeholder="Nom de la guilde" value={newGuild.guild_name} onChange={(e) => setNewGuild({ ...newGuild, guild_name: e.target.value })} />
            <input className="input" maxLength={40} placeholder="Période (ex. 2024–2025)" value={newGuild.period} onChange={(e) => setNewGuild({ ...newGuild, period: e.target.value })} />
            <button className="btn-outline !py-2 text-sm" disabled={newGuild.guild_name.trim().length < 2} onClick={() => add('member_past_guilds', { guild_name: newGuild.guild_name.trim(), period: newGuild.period.trim() || null }, () => setNewGuild({ guild_name: '', period: '' }), guilds)}><Plus size={14} /> Ajouter</button>
          </div>
        </section>
      </div>
    </Card>
  )
}
