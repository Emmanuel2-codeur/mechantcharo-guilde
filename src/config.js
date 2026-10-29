// Centralise les liens de navigation et les actions principales du site.
// Le site est la page officielle de la guilde ; chaque tournoi vit sous /tournois/<slug>.
export const TOURNAMENT_BASE = '/tournois/bataille-des-charos'
export const tPath = (path = '') => `${TOURNAMENT_BASE}${path}`

// Navigation globale (guilde)
export const GUILD_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/tournois', label: 'Tournois' },
  { to: '/membres', label: 'Membres' },
  { to: '/evenements', label: 'Événements' },
  { to: '/classement-guilde', label: 'Classement' },
  { to: '/annonces', label: 'Annonces' },
]

// Sous-navigation affichée uniquement dans la Bataille des Charos
export const TOURNAMENT_LINKS = [
  { to: tPath(), label: 'Présentation', end: true },
  { to: tPath('/matchs'), label: 'Matchs' },
  { to: tPath('/groupes'), label: 'Poules' },
  { to: tPath('/bracket'), label: '16ème de finales' },
  { to: tPath('/classement'), label: 'Classement' },
  { to: tPath('/historique'), label: 'Historique' },
  { to: tPath('/reglement'), label: 'Règlement' },
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
