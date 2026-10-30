import { Megaphone, Paperclip, Pencil, Save, Trash2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { uploadPublicFile } from '@/shared/lib/storage'
import { useState } from 'react'

/** Publier, modifier et supprimer les annonces (texte, image, pièce jointe). */
function AnnouncementsSection({ announcements, authorId, onChanged, setError, setMessage }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('information')
  const [imageFile, setImageFile] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingImageFile, setEditingImageFile] = useState(null)

  const publish = async (e) => {
    e.preventDefault()
    if (!body.trim()) { setError('Écris un message avant de publier.'); return }
    setError(''); setMessage(''); setPublishing(true)

    let imageUrl = null
    if (imageFile) {
      const result = await uploadPublicFile(imageFile, 'announcements')
      if (result.error) {
        setError(`Impossible d'envoyer l'image : ${result.error.message}`)
        setPublishing(false)
        return
      }
      imageUrl = result.data.url
    }

    const { error } = await supabase.from('announcements').insert({
      title: title.trim() || null,
      body: body.trim(),
      category,
      image_url: imageUrl,
      author_id: authorId || null,
      published: true,
    })

    if (error) setError(error.message)
    else {
      setMessage('Annonce publiée — visible immédiatement dans Annonces.')
      setTitle(''); setBody(''); setImageFile(null); setCategory('information')
      onChanged()
    }
    setPublishing(false)
  }

  const remove = async (id) => {
    if (!window.confirm('Supprimer cette annonce et ses commentaires ?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) setError(error.message)
    else { setMessage('Annonce supprimée.'); onChanged() }
  }

  const saveEdit = async (a) => {
    setError('')
    let imageUrl = a.image_url || null
    if (editingImageFile) {
      const result = await uploadPublicFile(editingImageFile, 'announcements')
      if (result.error) { setError(`Impossible d'envoyer l'image : ${result.error.message}`); return }
      imageUrl = result.data.url
    }

    const { error } = await supabase.from('announcements').update({
      title: a.title?.trim() || null,
      body: a.body.trim(),
      category: a.category || 'information',
      image_url: imageUrl,
      published: !!a.published,
    }).eq('id', a.id)
    if (error) setError(error.message)
    else { setMessage('Annonce modifiée.'); setEditing(null); setEditingImageFile(null); onChanged() }
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <Megaphone size={18} className="text-charo-orange" />
        <h2 className="font-bold text-lg text-ink">Publier une annonce</h2>
      </div>
      <p className="text-sm text-muted mb-5">Publication instantanée dans la page Annonces, avec commentaires, réponses et réactions.</p>

      <form onSubmit={publish} className="card p-6 mb-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'annonce" className="w-full rounded-lg bg-white border border-line text-sm px-3.5 py-2.5 outline-none focus:border-charo-orange" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg bg-white border border-line text-sm px-3.5 py-2.5 outline-none focus:border-charo-orange">
            <option value="information">📢 Information</option>
            <option value="match">⚔️ Match</option>
            <option value="result">🏆 Résultat</option>
            <option value="event">🔥 Événement</option>
          </select>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Ton message pour les joueurs…" className="w-full rounded-lg bg-white border border-line text-sm px-3.5 py-2.5 outline-none focus:border-charo-orange resize-none" />

        <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="w-10 h-10 rounded-xl bg-charo-orange/10 text-charo-orange flex items-center justify-center"><Paperclip size={18} /></span>
            <span>
              <span className="block text-sm font-bold">Ajouter une image</span>
              <span className="block text-xs text-muted mt-0.5">Téléverse directement depuis ton ordinateur · 10 Mo max</span>
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>
          {imageFile && <p className="text-xs text-charo-orange font-semibold mt-3">Image sélectionnée : {imageFile.name}</p>}
        </div>

        <button type="submit" disabled={publishing} className="btn-primary">
          {publishing ? 'Téléversement / publication…' : 'Publier l’annonce'}
        </button>
      </form>

      {announcements.length > 0 && (
        <div className="card divide-y divide-line">
          {announcements.map((a) => (
            <div key={a.id} className="p-4">
              {editing?.id === a.id ? (
                <div className="space-y-3">
                  <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
                  <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={4} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
                  <select value={editing.category || 'information'} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm">
                    <option value="information">📢 Information</option><option value="match">⚔️ Match</option><option value="result">🏆 Résultat</option><option value="event">🔥 Événement</option>
                  </select>
                  <div className="rounded-xl border border-dashed border-line bg-surface-soft p-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                      <Paperclip size={15} className="text-charo-orange" /> Remplacer l'image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditingImageFile(e.target.files?.[0] || null)} />
                    </label>
                    {editingImageFile && <p className="text-xs text-charo-orange mt-2">Nouvelle image : {editingImageFile.name}</p>}
                    {editing.image_url && !editingImageFile && <img src={editing.image_url} alt="" className="mt-3 h-28 w-full object-cover rounded-xl" />}
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> Publiée</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(editing)} className="btn-primary !px-4 !py-2 text-xs"><Save size={14} /> Enregistrer</button>
                    <button type="button" onClick={() => { setEditing(null); setEditingImageFile(null) }} className="btn-outline !px-4 !py-2 text-xs">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-charo-orange">{a.category || 'information'}</span>
                      {!a.published && <span className="text-[10px] rounded-full bg-surface-soft px-2 py-1">Brouillon</span>}
                    </div>
                    {a.title && <p className="font-semibold text-sm">{a.title}</p>}
                    <p className="text-sm text-muted whitespace-pre-wrap">{a.body}</p>
                    {a.image_url && <img src={a.image_url} alt="" className="mt-3 max-h-40 rounded-xl object-cover" />}
                    <p className="text-[11px] text-muted mt-1">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditing({ ...a }); setEditingImageFile(null) }} className="w-8 h-8 rounded-lg border border-line text-muted flex items-center justify-center hover:bg-surface-soft" aria-label="Modifier"><Pencil size={13} /></button>
                    <button type="button" onClick={() => remove(a.id)} className="w-8 h-8 rounded-lg border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white" aria-label="Supprimer"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AnnouncementsSection
