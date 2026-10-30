import { PHASE_LABELS } from '@/features/tournament/phaseLabels'

export const MATCH_TYPES = [
  { value: 'onetap', label: 'One Tap (Aller)' },
  { value: 'spam', label: 'Spam (Retour)' },
]

export const PHASES = Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label }))
