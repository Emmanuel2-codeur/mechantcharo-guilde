export const GUILD_ROLES = [
  { value: 'chef', label: 'Chef' },
  { value: 'adjoint', label: 'Adjoint' },
  { value: 'ancien', label: 'Ancien' },
  { value: 'membre', label: 'Membre' },
  { value: 'recrue', label: 'Recrue' },
]
export const roleLabel = (v) => GUILD_ROLES.find((r) => r.value === v)?.label || v

export const EVENT_KINDS = [
  { value: 'guerre', label: 'Guerre de guilde' },
  { value: 'gvg', label: 'Guilde vs guilde' },
  { value: 'tournoi', label: 'Tournoi' },
  { value: 'special', label: 'Événement spécial' },
]
export const kindLabel = (v) => EVENT_KINDS.find((k) => k.value === v)?.label || v

export const ATTENDANCE = [
  { value: 'present', label: 'Présent', cls: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'partial', label: 'Partiel', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'absent_justified', label: 'Justifié', cls: 'bg-sky-50 text-sky-700 border-sky-300' },
  { value: 'absent_unjustified', label: 'Absent', cls: 'bg-red-50 text-red-700 border-red-300' },
]

export const ACTIVITY = {
  actif: { label: 'Actif', dot: 'bg-green-500', cls: 'text-green-700 bg-green-50' },
  irregulier: { label: 'Irrégulier', dot: 'bg-amber-500', cls: 'text-amber-700 bg-amber-50' },
  inactif: { label: 'Inactif', dot: 'bg-red-500', cls: 'text-red-700 bg-red-50' },
  nouveau: { label: 'Nouveau', dot: 'bg-slate-400', cls: 'text-slate-600 bg-slate-100' },
}

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const RESULTS = [
  { value: '', label: 'Résultat…' },
  { value: 'win', label: 'Victoire' },
  { value: 'draw', label: 'Nul' },
  { value: 'loss', label: 'Défaite' },
]

// Mêmes seuils que la fonction SQL guild_honor()
export const LEVELS = [
  { name: 'Bronze', min: 0 },
  { name: 'Argent', min: 150 },
  { name: 'Or', min: 400 },
  { name: 'Légende', min: 800 },
]
export const levelProgress = (score) => {
  const i = LEVELS.reduce((acc, l, idx) => (score >= l.min ? idx : acc), 0)
  const next = LEVELS[i + 1]
  const pct = next ? Math.round(((score - LEVELS[i].min) / (next.min - LEVELS[i].min)) * 100) : 100
  return { current: LEVELS[i], next, pct }
}
