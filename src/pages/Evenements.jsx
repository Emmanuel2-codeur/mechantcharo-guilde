import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { useReveal } from '../lib/useGsapEffects'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabaseClient'
import { kindLabel, fmtDateTime } from '../lib/guild'

export default function Evenements() {
  const pageRef = useRef(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useReveal(pageRef, [loading])

  useEffect(() => {
    supabase.from('guild_events').select('id, kind, title, starts_at, notes').order('starts_at', { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [])

  const now = Date.now()
  const upcoming = events.filter((e) => new Date(e.starts_at) >= now)
  const past = events.filter((e) => new Date(e.starts_at) < now).reverse().slice(0, 12)

  const List = ({ items, empty }) => items.length === 0 ? <p className="text-ink-600">{empty}</p> : (
    <div className="card divide-y divide-ink-700">
      {items.map((e) => (
        <div key={e.id} className="px-5 py-4">
          <p className="font-bold">{e.title}</p>
          <p className="text-sm text-ink-600">{kindLabel(e.kind)} · {fmtDateTime(e.starts_at)}</p>
          {e.notes && <p className="text-sm text-ink-600 mt-1">{e.notes}</p>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen" ref={pageRef}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <span data-reveal className="eyebrow mb-4">Calendrier</span>
        <h1 data-reveal className="font-display text-5xl md:text-6xl text-ink-950 mb-3">Événements</h1>
        <p data-reveal className="text-ink-600 mb-10">Guerres de guilde (mercredi, vendredi, samedi), guilde vs guilde et rendez-vous spéciaux.</p>
        {loading ? <p className="text-ink-600">Chargement…</p> : (
          <>
            <h2 data-reveal className="font-display text-2xl text-ink-950 mb-4">À venir</h2>
            <div className="mb-12"><List items={upcoming.slice(0, 15)} empty="Aucun événement programmé pour le moment." /></div>
            <h2 data-reveal className="font-display text-2xl text-ink-950 mb-4">Passés</h2>
            <List items={past} empty="Aucun événement passé." />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
