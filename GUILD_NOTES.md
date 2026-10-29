# Guilde MÉCHANTCHARO — mise en route des nouveautés

## 1. Base de données (Supabase > SQL Editor, dans l'ordre, un fichier à la fois)
1. `sql/04_guild_phase2.sql`  — membres, événements, présences
2. `sql/05_guild_phase3_honor.sql` — barème, honneur, classement, badges
3. `sql/06_guild_phase4_tools.sql` — import des joueurs, rappels, MVP du mois
4. `sql/07_guild_applications.sql` — candidatures (formulaire public `/rejoindre`)
5. `sql/08_sync_members_with_players.sql` — les joueurs approuvés deviennent automatiquement membres
6. `sql/09_guild_duos.sql` — classement des duos (saisi par les admins)

## 2. Rappels d'événements (optionnel)
Activer l'extension **pg_cron** (Database > Extensions), puis décommenter la ligne
`cron.schedule(...)` à la fin de `06_guild_phase4_tools.sql`. Les rappels arrivent dans le
centre de notifications, et en push si `send-push` est branché sur la table `notifications`.

## 3. Assistant IA des admins (optionnel)
```bash
supabase functions deploy admin-assistant
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
Réservé aux admins (vérifié côté serveur). Il propose, l'admin valide : aucune écriture automatique.

## 4. Pages
Publiques : `/`, `/tournois`, `/membres`, `/evenements`, `/classement-guilde`, `/annonces`
Tournoi : `/tournois/bataille-des-charos/...` (anciens liens redirigés)
Admin : `/admin?tab=guilde`

## 5. Candidatures
Formulaire public `/rejoindre` ; validation dans Admin > Vie de guilde > Candidatures.
Email de décision (optionnel) : `supabase functions deploy send-application-decision` puis
`supabase secrets set RESEND_API_KEY=re_... ALERT_EMAIL_FROM=guilde@tondomaine.com`.
Sans cela, un bouton « Écrire au candidat » ouvre un email pré-rempli.
