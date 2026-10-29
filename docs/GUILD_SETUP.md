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
| `ALL_IN_ONE.sql` | tout ce qui précède, dans l'ordre (nouvelle installation) |

**Déjà installé avant la restructuration ?** (anciens fichiers 04 à 09) Exécute seulement, dans l'ordre :
`00_audit.sql`, `07_charo_dor.sql`, puis `08_merge_member_rankings.sql`. Les autres sont déjà en place.

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
Publiques : `/`, `/tournois`, `/guilde`, `/classement-guilde`, `/charo-dor`, `/annonces`, `/rejoindre`
Tournoi : `/tournois/bataille-des-charos/…` (anciens liens redirigés)
Admin : `/admin?tab=guilde&sub=charodor` (ou `presences`, `membres`, `duos`, `honneur`, `assistant`…)
