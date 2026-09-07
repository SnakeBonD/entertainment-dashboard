# SnakeBonD Entertainment Dashboard

Dashboard personnel regroupant des contenus gratuits et légaux accessibles en France.

Production : <https://entertainment.snakebond.net>

## État du projet

La version **v0.3** personnalise le catalogue sans compte utilisateur ni serveur :

- interface sombre responsive ;
- 40 plateformes officielles réparties en huit catégories ;
- recherche tolérante aux accents ;
- filtres par catégorie, accès, compte, publicité et langue ;
- tris par sélection, nom ou date de vérification ;
- fiches enrichies avec badges et date de contrôle ;
- favoris conservés dans le navigateur ;
- espace « Pour moi » avec accès direct aux favoris ;
- profil local par univers préférés et priorités d’accès ;
- classement personnalisé avec score et raisons visibles ;
- recommandations qui tiennent compte des favoris, du français, de la publicité et du compte ;
- module « Que regarder ce soir ? » relié à de vraies plateformes ;
- menu mobile compact et accessible ;
- station musicale hebdomadaire ;
- programmes YouTube, podcasts, apprentissage et week-end ;
- module « Que regarder ce soir ? » ;
- métadonnées séparées du contenu principal ;
- surveillance hebdomadaire automatique des liens officiels.

Les anciens titres de films datés du 17 juillet 2026 ne sont pas présentés comme encore disponibles. Les futurs contenus du catalogue seront affichés seulement après vérification.

## Architecture

```text
entertainment-dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── catalog.js
│   ├── favorites.js
│   ├── preferences.js
│   ├── personalization.js
│   └── recommendations.js
├── data/
│   ├── archive.json
│   ├── catalogue.json
│   ├── platform-metadata.json
│   ├── platforms.json
│   ├── recommendations.json
│   └── schedule.json
├── scripts/
│   ├── check-links.mjs
│   ├── test-catalog.mjs
│   ├── test-personalization.mjs
│   └── validate.mjs
├── .github/workflows/
│   ├── check-links.yml
│   └── deploy.yml
├── CNAME
├── LICENSE
└── README.md
```

## Lancer le site localement

Le chargement des fichiers JSON nécessite un petit serveur HTTP local.

```bash
python -m http.server 8080
```

Puis ouvrir <http://localhost:8080>.

## Validation

```bash
node scripts/validate.mjs
node scripts/test-catalog.mjs
node scripts/test-personalization.mjs
node --check js/app.js
node --check js/catalog.js
node --check js/favorites.js
node --check js/preferences.js
node --check js/personalization.js
node --check js/recommendations.js
```

## Données

`data/platforms.json` contient le répertoire permanent des plateformes.

`data/platform-metadata.json` contient les informations utilisées par les filtres : type d’accès,
compte, publicité, langues, tags, disponibilité en France et date du dernier audit.

`data/catalogue.json` accueillera les contenus vérifiés et leurs dates de disponibilité :

```json
{
  "id": "source-identifiant",
  "title": "Titre",
  "category": "movie",
  "platform": "ARTE",
  "url": "https://…",
  "free": true,
  "country": "FR",
  "addedDate": "2026-09-04",
  "expiryDate": "2026-09-30T23:59:00+02:00",
  "verified": true,
  "verifiedAt": "2026-09-04T08:00:00+02:00",
  "sourceUrl": "https://…"
}
```

Une entrée non vérifiée ne doit jamais être mise en avant comme nouveauté.

## Déploiement

Le workflow `deploy.yml` valide le site et le publie sur GitHub Pages après chaque push sur `main`. Le dépôt utilise **GitHub Actions** comme source de publication Pages.

Le fichier `CNAME` réserve le domaine `entertainment.snakebond.net`. Le domaine et son certificat HTTPS sont actifs.

Le workflow `check-links.yml` contrôle les 40 liens chaque lundi à 06 h 15 UTC. Il publie un
rapport dans le résumé GitHub Actions et conserve l’artefact pendant 30 jours. Une protection
anti-robot (`401`, `403` ou `429`) est signalée sans être assimilée à un lien supprimé.

## Feuille de route

- **v0.1** — structure initiale et mise en production ;
- **v0.2** — catalogue enrichi, recherche, filtres, mobile et surveillance des liens ;
- **v0.3** — favoris, profil local et recommandations personnalisées ;
- **v0.4** — dates d’expiration et archivage ;
- **v0.5** — automatisation des jeux Epic Games ;
- **v0.6** — automatisation des sélections ARTE ;
- **v0.7** — autres sources officielles automatisées ;
- **v0.8** — PWA installable ;
- **v1.0** — version stable complète.

## Sécurité et confidentialité

- Aucun secret ou identifiant dans le dépôt.
- Aucun tracker ni cookie publicitaire propre au dashboard.
- Favoris stockés uniquement dans `localStorage`.
- Préférences stockées uniquement dans `localStorage`, indépendamment des favoris.
- Calcul des recommandations effectué dans le navigateur, avec raisons affichées.
- Liens limités aux plateformes officielles sélectionnées.

## Méthode de contribution

1. Partir de `main` à jour.
2. Créer une branche `codex/<fonction>`.
3. Vérifier l’état réel du code avant modification.
4. Préserver les fonctions déjà validées.
5. Exécuter les validations avant fusion dans `main`.
