import { Outlet } from 'react-router-dom'
import { Spinner } from '@/shared/ui'
import { useAccess } from '@/features/auth/useAccess'
import LockedNotice from '@/features/auth/LockedNotice'

/** Route protégée : le contenu n'est affiché qu'aux membres approuvés (et admins). */
export default function RequireMember() {
  const { loading, isMember } = useAccess()
  if (loading) return <Spinner className="flex-1" />
  return isMember ? <Outlet /> : <LockedNotice />
}
