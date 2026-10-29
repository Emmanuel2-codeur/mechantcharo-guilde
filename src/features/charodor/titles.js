import { Crown, Target, Shield, Zap, Crosshair, Swords, TrendingUp, Trophy } from 'lucide-react'

// Icône de chaque titre (par code) ; le texte et l'ordre viennent de la table charo_dor_titles.
export const TITLE_ICONS = {
  saison: Crown, br_level: Target, cs_level: Shield, gvg_onetap: Zap,
  gvg_spam: Crosshair, war_points: Swords, weekly_contrib: TrendingUp,
}
export const titleIcon = (code) => TITLE_ICONS[code] || Trophy
