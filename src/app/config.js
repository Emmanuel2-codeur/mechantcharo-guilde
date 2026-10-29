// Centralise les liens de navigation et les actions principales du site.
// Le site est la page officielle de la guilde ; chaque tournoi vit sous /tournois/<slug>.
export const TOURNAMENT_BASE = '/tournois/bataille-des-charos'
export const tPath = (path = '') => `${TOURNAMENT_BASE}${path}`

// Navigation globale (guilde) : 6 entrées. « La guilde » regroupe membres + événements, « Classement » regroupe membres + duos.
export const GUILD_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/tournois', label: 'Tournois' },
  { to: '/guilde', label: 'La guilde', also: ['/membres', '/evenements', '/rejoindre'] },
  { to: '/classement-guilde', label: 'Classement' },
  { to: '/charo-dor', label: 'Charo d’Or' },
  { to: '/annonces', label: 'Annonces' },
]

// Sous-navigation affichée uniquement dans la Bataille des Charos (`also` = pages regroupées sous la même entrée)
export const TOURNAMENT_LINKS = [
  { to: tPath(), label: 'Présentation', end: true },
  { to: tPath('/matchs'), label: 'Matchs', also: [tPath('/historique')] },
  { to: tPath('/groupes'), label: 'Poules' },
  { to: tPath('/bracket'), label: 'Phase finale', also: [tPath('/finalistes')] },
  { to: tPath('/classement'), label: 'Classement' },
  { to: tPath('/reglement'), label: 'Règlement' },
]

// Onglets de liens affichés en haut des pages regroupées
export const MATCH_TABS = [
  { to: tPath('/matchs'), label: 'Matchs' },
  { to: tPath('/historique'), label: 'Historique' },
]
export const FINAL_TABS = [
  { to: tPath('/bracket'), label: 'Bracket' },
  { to: tPath('/finalistes'), label: 'Les 32 finalistes' },
]

// Anciennes URLs (à plat) -> nouvelles, pour ne casser aucun lien partagé ou notification
export const LEGACY_REDIRECTS = ['matchs', 'groupes', 'bracket', 'finalistes', 'reglement', 'classement', 'historique']

export const TOURNAMENTS = [
  {
    slug: 'bataille-des-charos',
    to: TOURNAMENT_BASE,
    title: 'La Bataille des Charos',
    game: 'Free Fire',
    format: 'Tournoi solo 1v1',
    text: 'Poules, repêchage et bracket à élimination directe. Un seul Charo reste debout.',
  },
]

export const HOME_ACTIONS = [
  { to: '/connexion', label: 'Rejoindre le tournoi', variant: 'primary' },
  { to: tPath('/matchs'), label: 'Voir les matchs', variant: 'dark' },
  { to: tPath('/bracket'), label: 'Voir le bracket', variant: 'default' },
  { to: tPath('/classement'), label: 'Voir le classement', variant: 'default' },
  { to: tPath('/finalistes'), label: 'Voir les 32 finalistes', variant: 'default' },
  { to: '/annonces', label: 'Voir les annonces', variant: 'default' },
]

export const PAGE_LINKS = {
  matchs: tPath('/matchs'),
  classement: tPath('/classement'),
  bracket: tPath('/bracket'),
  annonces: '/annonces',
}

export const STORAGE_BUCKET = 'announcement-media'
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
