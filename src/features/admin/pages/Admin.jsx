import AdminTabs from '@/features/admin/components/AdminTabs'
import { AnimatePresence, motion } from 'framer-motion'
import AuditLogSection from '@/features/admin/sections/AuditLogSection'
import { ClipboardCheck, History, LayoutDashboard, Megaphone, RefreshCw, ShieldAlert, Swords, Trophy, UserPlus, Users } from 'lucide-react'
import DashboardSection from '@/features/admin/sections/DashboardSection'
import FinalistsAdmin from '@/features/admin/components/FinalistsAdmin'
import GuildAdmin from '@/features/admin/sections/GuildAdmin'
import SecurityAlertsSection from '@/features/admin/sections/SecurityAlertsSection'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/features/auth/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import PendingSection from '@/features/admin/sections/PendingSection'
import PlayerManagementSection from '@/features/admin/sections/PlayerManagementSection'
import ScheduleMatchSection from '@/features/admin/sections/ScheduleMatchSection'
import ValidateScoreSection from '@/features/admin/sections/ValidateScoreSection'
import MatchManagementSection from '@/features/admin/sections/MatchManagementSection'
import AnnouncementsSection from '@/features/admin/sections/AnnouncementsSection'

export default function Admin() {
  const { profile, isSuperAdmin } = useAuth()
  const [pending, setPending] = useState([])
  const [groups, setGroups] = useState([])
  const [players, setPlayers] = useState([]) // joueurs approuvés, pour les selects
  const [matches, setMatches] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [securityAlerts, setSecurityAlerts] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'dashboard')
  const changeTab = (id) => {
    setTab(id)
    const url = new URL(window.location)
    url.searchParams.set('tab', id)
    window.history.replaceState({}, '', url)
  }

  const loadAll = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase n’est pas configuré (fichier .env manquant).')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')

    const queries = [
      supabase.rpc('admin_list_pending_players'),
      supabase.from('groups').select('id, name').order('name', { ascending: true }),
      supabase.from('profiles').select('id, pseudo, ff_uid, group_id, total_points, total_kills, total_damage, wins, losses, is_qualified, qualification_seed').eq('status', 'approved').order('pseudo'),
      supabase
        .from('matches')
        .select(
          'id, phase, group_id, leg, match_type, round_label, bracket_position, player1_id, player2_id, score1, score2, damage1, damage2, score1_retour, score2_retour, damage1_retour, damage2_retour, winner_id, status, status_override, is_featured, scheduled_at, scheduled_at_retour, player1:profiles!matches_player1_id_fkey(pseudo), player2:profiles!matches_player2_id_fkey(pseudo)'
        )
        .order('scheduled_at', { ascending: true, nullsFirst: false }),
      supabase.from('announcements').select('id, title, body, published, category, image_url, author_id, created_at').order('created_at', { ascending: false }),
      supabase.from('audit_log').select('id, actor_pseudo, action, entity_type, entity_label, created_at').order('created_at', { ascending: false }).limit(200),
    ]
    if (isSuperAdmin) {
      queries.push(supabase.from('security_alerts').select('*').order('created_at', { ascending: false }).limit(100))
    }

    const results = await Promise.all(queries)
    const [
      { data: pendingRows, error: pendingError },
      { data: groupRows, error: groupsError },
      { data: playerRows, error: playersError },
      { data: matchRows, error: matchesError },
      { data: announceRows, error: announceError },
      { data: auditRows, error: auditError },
    ] = results
    const { data: alertRows, error: alertError } = isSuperAdmin ? results[6] : { data: [], error: null }

    const firstError = pendingError || groupsError || playersError || matchesError || announceError || auditError || alertError
    if (firstError) {
      setError(firstError.message)
    } else {
      setPending(pendingRows || [])
      setGroups(groupRows || [])
      setPlayers(playerRows || [])
      setMatches((matchRows || []).map((m) => ({
        ...m,
        score1: Number(m.score1 || 0), score2: Number(m.score2 || 0),
        damage1: Number(m.damage1 || 0), damage2: Number(m.damage2 || 0),
      })))
      setAnnouncements(announceRows || [])
      setAuditLog(auditRows || [])
      setSecurityAlerts(alertRows || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const unresolvedAlerts = securityAlerts.filter((a) => !a.resolved).length

  const TABS = useMemo(() => {
    const list = [
      { id: 'dashboard', group: 'Général', label: 'Vue d’ensemble', icon: <LayoutDashboard size={15} /> },
      { id: 'inscriptions', group: 'Tournoi', label: 'Inscriptions', icon: <UserPlus size={15} />, badge: pending.length },
      { id: 'joueurs', group: 'Tournoi', label: 'Joueurs & poules', icon: <Users size={15} /> },
      { id: 'finalistes', group: 'Tournoi', label: 'Joueurs qualifiés', icon: <Trophy size={15} />, badge: players.filter(p => p.is_qualified).length },
      { id: 'matchs', group: 'Tournoi', label: 'Matchs', icon: <Swords size={15} />, badge: matches.filter(m => m.status !== 'completed').length },
      { id: 'guilde', group: 'Guilde', label: 'Vie de guilde', icon: <ClipboardCheck size={15} /> },
      { id: 'annonces', group: 'Communication', label: 'Annonces', icon: <Megaphone size={15} /> },
      { id: 'journal', group: 'Système', label: 'Journal', icon: <History size={15} /> },
    ]
    if (isSuperAdmin) list.push({ id: 'securite', group: 'Système', label: 'Sécurité', icon: <ShieldAlert size={15} />, badge: unresolvedAlerts })
    return list
  }, [pending.length, matches, players, isSuperAdmin, unresolvedAlerts])

  return (
    <div>

      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-8">
            <div>
              <span className="eyebrow mb-4"><ShieldAlert size={12} /> Espace administration{isSuperAdmin ? ' · Super-admin' : ''}</span>
              <h1 className="font-display text-4xl md:text-5xl mb-2 text-ink">Panneau de contrôle</h1>
              <p className="text-muted max-w-xl">
                Chaque action ici met à jour le site en direct : joueur validé → visible dans son groupe et
                le classement · match programmé → apparaît en En cours à l'heure dite · info publiée → visible à l'accueil.
              </p>
            </div>
            <button onClick={loadAll} className="btn-primary" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>

          {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

          <AdminTabs tabs={TABS} active={tab} onChange={changeTab} />

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'dashboard' && (
                <DashboardSection players={players} matches={matches} groups={groups} pendingCount={pending.length} recentActivity={auditLog.slice(0, 8)} />
              )}

              {tab === 'inscriptions' && (
                <PendingSection
                  pending={pending} groups={groups}
                  onChanged={loadAll} setError={setError} setMessage={setMessage}
                />
              )}

              {tab === 'joueurs' && (
                <>
                  <PlayerManagementSection
                    players={players} groups={groups}
                    onChanged={loadAll} setError={setError} setMessage={setMessage}
                  />
                </>
              )}

              {tab === 'finalistes' && (
                <FinalistsAdmin
                  players={players}
                  onChanged={loadAll}
                  setError={setError}
                  setMessage={setMessage}
                />
              )}

              {tab === 'matchs' && (
                <>
                  <ScheduleMatchSection
                    players={players} groups={groups} matches={matches}
                    onCreated={loadAll} setError={setError} setMessage={setMessage}
                  />
                  <ValidateScoreSection
                    matches={matches}
                    onSaved={loadAll} setError={setError} setMessage={setMessage}
                  />
                  <MatchManagementSection
                    matches={matches} players={players} groups={groups}
                    onChanged={loadAll} setError={setError} setMessage={setMessage}
                  />
                </>
              )}

              {tab === 'guilde' && <GuildAdmin setMessage={setMessage} setError={setError} />}
              {tab === 'annonces' && (
                <AnnouncementsSection
                  announcements={announcements}
                  authorId={profile?.id}
                  onChanged={loadAll} setError={setError} setMessage={setMessage}
                />
              )}

              {tab === 'journal' && <AuditLogSection entries={auditLog} />}

              {tab === 'securite' && isSuperAdmin && (
                <SecurityAlertsSection alerts={securityAlerts} onChanged={loadAll} setMessage={setMessage} setError={setError} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

    </div>
  )
}
