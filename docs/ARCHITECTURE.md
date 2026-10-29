# Architecture — MÉCHANTCHARO

Site officiel de la guilde (React + Vite + Tailwind + Supabase + GSAP). Les imports utilisent l'alias `@` (= `src/`).

```
src/
  app/            Layout (navbar + footer + fond + transition), Navbar, Footer, config (liens, tournois)
  features/       un dossier par domaine
    guild/        accueil, « La guilde » (membres + événements), candidature
    tournament/   Bataille des Charos (landing, matchs, poules, phase finale, classement…)
    rankings/     Classement de la guilde (membres + duos)
    charodor/     Charo d'Or (titres désignés par les admins)
    announcements/  annonces, commentaires, réactions
    auth/         connexion, profil, AuthContext, AdminRoute
    notifications/  centre de notifications
    admin/        panneau d'administration (pages/, sections/, components/)
  shared/
    ui/           Button, Card, Chip, PageHeader, Page/Container, Tabs, LinkTabs, QueryState, Spinner, EmptyState
    hooks/        useSupabaseQuery (chargement/erreur/rafraîchissement), useReveal, useCountUp (GSAP)
    lib/          supabaseClient, gsap, storage, cx
  styles/         index.css (design universel : noir + orange Charo)
sql/              schéma d'origine (01–03) + sql/guild/ (vie de guilde : 00 → 08, ou ALL_IN_ONE.sql)
supabase/functions/  send-push, send-security-alert, admin-assistant, send-application-decision
```

## Règles du projet
1. **Une page = un fichier dans `features/<domaine>/pages`.** Elle ne rend ni `<Navbar />` ni `<Footer />` : c'est le `Layout`.
2. **Les données passent par `useSupabaseQuery`** (+ `<QueryState>` pour chargement / erreur / vide). Pas de `useEffect` + `setLoading` recopiés.
3. **Les en-têtes de page utilisent `<PageHeader>`**, les boutons `<Button>`, les cartes `<Card>`.
4. **Couleurs sémantiques** : `ink` (texte/sombre), `surface`, `surface-soft`, `line` (bordures), `muted` (texte secondaire), `charo-*` (orange).
5. **Animations** : GSAP. `data-reveal` sur un élément = apparition au scroll (appeler `useReveal(ref, deps)` dans la page) ; `data-count` = compteur animé (`useCountUp`).
6. **Audit** : une seule fonction (`fn_audit_guild` + `audit_label`, `sql/guild/00_audit.sql`). Pour une nouvelle table : une ligne dans `audit_label` + un trigger.

## Navigation
- Publique (6) : Accueil · Tournois · La guilde · Classement · Charo d'Or · Annonces.
- Tournoi (6) : Présentation · Matchs (+ Historique) · Poules · Phase finale (Bracket + 32 finalistes) · Classement · Règlement.
- Admin : groupes Général · Tournoi · Guilde (7 sous-onglets, `?tab=guilde&sub=…`) · Communication · Système.

## Reste à faire (voir docs/GUILD_SETUP.md)
- Découper `features/admin/pages/Admin.jsx` (≈1000 lignes) en un fichier par section avec une URL par section.
- Migrer les pages tournoi historiques vers `useSupabaseQuery` / `PageHeader`.
- Tables `tournaments` + inscriptions par tournoi (après la fin de la Bataille des Charos).
