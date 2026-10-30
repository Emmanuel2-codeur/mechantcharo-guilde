# Mise en route — vie de guilde

## 1. Base de données (Supabase > SQL Editor)
Le schéma du tournoi d'origine est dans `sql/01_schema.sql` à `03_*`. La vie de guilde est dans **`sql/guild/`** :

| Fichier | Contenu |
|---|---|
| `00_audit.sql` | fonction d'audit unique (à exécuter en premier, et à ré-exécuter si elle change) |
| `01_members_events_attendance.sql` | membres, événements, présences, activité |
| `02_honor_badges.sql` | barème, score d'honneur, score de guilde, badges |
| `03_tools_reminders_mvp.sql` | import des joueurs, rappels d'événements, MVP du mois |
| `04_applications.sql` | candidatures (formulaire public `/rejoindre`) |
| `05_sync_members_players.sql` | joueurs approuvés = membres de la guilde (automatique) |
| `06_duos.sql` | classement des duos |
| `07_charo_dor.sql` | Charo d'Or (titres et détenteurs désignés par les admins) |
| `08_merge_member_rankings.sql` | fusionne l'ancien classement saisi à la main dans le profil du membre |
| `09_access_control.sql` | accès visiteurs / membres (`is_member()`), classements réservés aux membres, correction des badges |
| `10_profiles_achievements.sql` | profils personnalisés (photo, présentation, distinctions, guildes), réalisations, Charo d'Or externe |
| `ALL_IN_ONE.sql` | tout ce qui précède, dans l'ordre (nouvelle installation) |

**Déjà installé avant la restructuration ?** (anciens fichiers 04 à 09) Exécute seulement, dans l'ordre :
`00_audit.sql`, `07_charo_dor.sql`, `08_merge_member_rankings.sql`, `09_access_control.sql`, puis `10_profiles_achievements.sql`. Les autres sont déjà en place.

## 2. Rappels d'événements (optionnel)
Activer l'extension **pg_cron**, puis décommenter la ligne `cron.schedule(...)` à la fin de `03_tools_reminders_mvp.sql`.

## 3. Fonctions Edge (optionnel)
```bash
supabase functions deploy admin-assistant
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy send-application-decision
supabase secrets set RESEND_API_KEY=re_... ALERT_EMAIL_FROM=guilde@tondomaine.com
```

## 4. Pages
Publiques : `/`, `/tournois` (liste), `/guilde` (membres), `/membre/:id`, `/realisations`, `/charo-dor`, `/annonces`, `/rejoindre`
Membres approuvés : `/classement-guilde`, calendrier (onglet Événements), tout `/tournois/bataille-des-charos/…`, `/profil` (éditeur de profil de guilde)
Tournoi : `/tournois/bataille-des-charos/…` (anciens liens redirigés)
Admin : `/admin?tab=guilde&sub=charodor` (ou `presences`, `membres`, `duos`, `honneur`, `assistant`…)

## 5. Qui voit quoi
| | Visiteur | Membre approuvé / admin |
|---|---|---|
| Accueil, membres (photo, rôle, profil), réalisations, Charo d'Or, annonces | oui | oui |
| Liste des tournois | oui (non cliquable) | oui (cliquable) |
| Détail du tournoi (matchs, poules, bracket, classement…) | non | oui |
| Classement de la guilde (honneur, duos), calendrier, niveau d'activité | non | oui |

La règle est appliquée dans l'interface (`useAccess`, `RequireMember`) **et** dans la base pour les tables de la guilde (fonction SQL `is_member()`, fichier `09_access_control.sql`).
⚠ Les tables du tournoi d'origine (matchs, poules, joueurs) gardent leurs règles RLS actuelles : le verrouillage du détail du tournoi est pour l'instant dans l'interface. Pour le rendre étanche côté base, il faudra restreindre leur lecture à `is_member()` (à faire avec précaution, le tournoi étant en cours).

## 6. Profils des membres
Un membre approuvé renseigne sa photo, sa présentation, ses distinctions et ses anciennes guildes dans `/profil` (« Mon profil de guilde »). La photo est envoyée dans le bucket `announcement-media` (dossier `avatars/`) ; les visiteurs peuvent l'agrandir depuis `/membre/:id`.
