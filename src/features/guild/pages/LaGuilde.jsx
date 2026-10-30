import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Page, PageHeader, Tabs, Button } from '@/shared/ui'
import { useReveal } from '@/shared/hooks/useGsapEffects'
import MembersView from '@/features/guild/components/MembersView'
import EventsView from '@/features/guild/components/EventsView'
import LockedNotice from '@/features/auth/LockedNotice'
import { useAccess } from '@/features/auth/useAccess'

const TABS = [{ value: 'membres', label: 'Membres' }, { value: 'evenements', label: 'Événements' }]

/** « La guilde » : les membres et le calendrier au même endroit (l'onglet est dans l'URL : ?tab=evenements). */
export default function LaGuilde() {
  const ref = useRef(null)
  const { isMember } = useAccess()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'membres'
  useReveal(ref, [tab])

  return (
    <div ref={ref}>
      <Page>
        <PageHeader
          eyebrow="La famille"
          title="La guilde"
          lead="Les joueurs acceptés par les admins forment la guilde. Découvre les membres et leurs profils ; le calendrier des guerres est réservé aux membres."
          actions={<Button to="/rejoindre" icon={UserPlus}>Rejoindre la guilde</Button>}
        />
        <Tabs className="mb-8" items={TABS} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} />
        {tab === 'membres' ? <MembersView /> : isMember ? <EventsView /> : <LockedNotice inline what="Le calendrier des guerres et événements" />}
      </Page>
    </div>
  )
}
