# SnakeBonD Entertainment Dashboard

Dashboard personnel regroupant des contenus gratuits et légaux accessibles en France.

Production : <https://entertainment.snakebond.net>

## État du projet

La version **v0.5** automatise les jeux temporairement gratuits de l’Epic Games Store :

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
- espace « Disponibilités » réservé aux contenus datés et vérifiés ;
- alerte automatique pendant les sept derniers jours de disponibilité ;
- filtres par échéance, type, titre et plateforme ;
- accès à la source officielle utilisée pour chaque date ;
- archivage quotidien des contenus expirés à 05 h 40 UTC ;
- import automatique des promotions Epic Games actives pour la France ;
- exclusion des jeux gratuits en permanence, remises payantes et extensions ;
- actualisation toutes les six heures et au premier déploiement de la v0.5 ;
- images officielles, prix habituel et lien direct vers chaque jeu offert ;
- masquage de sécurité lorsqu’une offre disparaît du flux officiel avant sa date de fin ;
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
│   ├── availability.js
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
│   ├── archive-expired.mjs
│   ├── epic-games.mjs
│   ├── fetch-epic-games.mjs
│   ├── test-availability.mjs
│   ├── test-catalog.mjs
│   ├── test-epic-games.mjs
│   ├── test-personalization.mjs
│   └── validate.mjs
├── .github/workflows/
│   ├── archive-expired.yml
│   ├── check-links.yml
│   ├── fetch-epic-games.yml
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
node scripts/test-availability.mjs
node scripts/test-epic-games.mjs
node --check js/app.js
node --check js/availability.js
node --check js/catalog.js
node --check js/favorites.js
node --check js/preferences.js
node --check js/personalization.js
node --check js/recommendations.js
node --check scripts/epic-games.mjs
node --check scripts/fetch-epic-games.mjs
```

## Données

`data/platforms.json` contient le répertoire permanent des plateformes.

`data/platform-metadata.json` contient les informations utilisées par les filtres : type d’accès,
compte, publicité, langues, tags, disponibilité en France et date du dernier audit.

`data/catalogue.json` accueille uniquement les contenus actifs. `data/archive.json` reçoit les
entrées expirées sans perdre leur source ni leur historique de vérification :

```json
{
  "version": 4,
  "lastUpdated": "2026-09-07T10:00:00+02:00",
  "items": [
    {
      "id": "source-identifiant",
      "title": "Titre",
      "type": "movie",
      "platform": "ARTE",
      "url": "https://…",
      "country": "FR",
      "addedDate": "2026-09-07",
      "expiryDate": "2026-09-30T23:59:00+02:00",
      "verified": true,
      "verifiedAt": "2026-09-07T10:00:00+02:00",
      "sourceUrl": "https://…"
    }
  ]
}
```

Une entrée non vérifiée ne doit jamais être mise en avant comme nouveauté.

### Epic Games Store

`scripts/fetch-epic-games.mjs` interroge le catalogue officiel Epic Games avec la locale
`fr-FR` et le pays `FR`. L’import conserve uniquement les jeux dont le prix habituel est
supérieur à zéro, dont le prix promotionnel est nul et dont la promotion est active.

Chaque entrée Epic Games ajoute au schéma commun :

- `provider: "epic-games-store"` et l’identifiant de l’offre source ;
- le début et la fin exacts de la promotion ;
- le prix habituel affiché par Epic Games ;
- une image officielle et le lien vers la fiche française du jeu.

L’import refuse de remplacer le catalogue si le flux est invalide ou si aucun jeu temporairement
gratuit n’est confirmé. Les entrées non Epic Games sont toujours préservées.

## Déploiement

Le workflow `deploy.yml` valide le site et le publie sur GitHub Pages après chaque push sur `main`. Le dépôt utilise **GitHub Actions** comme source de publication Pages.

Le fichier `CNAME` réserve le domaine `entertainment.snakebond.net`. Le domaine et son certificat HTTPS sont actifs.

Le workflow `check-links.yml` contrôle les 40 liens chaque lundi à 06 h 15 UTC. Il publie un
rapport dans le résumé GitHub Actions et conserve l’artefact pendant 30 jours. Une protection
anti-robot (`401`, `403` ou `429`) est signalée sans être assimilée à un lien supprimé.

Le workflow `archive-expired.yml` s’exécute chaque jour à 05 h 40 UTC. Il déplace une entrée dont
la date de fin est dépassée vers `data/archive.json`, valide les données, puis publie la mise à jour
uniquement si un changement est nécessaire.

Le workflow `fetch-epic-games.yml` s’exécute toutes les six heures. Il récupère les promotions
Epic Games pour la France, actualise le catalogue, archive les offres terminées et ne crée un commit
que lorsque les données ont réellement changé. Les deux tâches de maintenance partagent la même
file d’exécution afin d’éviter les mises à jour concurrentes.

## Feuille de route

- **v0.1** — structure initiale et mise en production ;
- **v0.2** — catalogue enrichi, recherche, filtres, mobile et surveillance des liens ;
- **v0.3** — favoris, profil local et recommandations personnalisées ;
- **v0.4** — dates d’expiration, alertes et archivage automatique ;
- **v0.5** — automatisation des jeux Epic Games, contrôle des offres et images officielles ;
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
- Aucun contenu daté n’est affiché sans vérification et source officielle.
- Une entrée expirée est conservée dans l’archive au lieu d’être supprimée.
- L’import Epic Games utilise uniquement des données officielles destinées à la France.
- Une réponse vide ou invalide ne peut pas effacer les données déjà publiées.
- Liens limités aux plateformes officielles sélectionnées.

## Méthode de contribution

1. Partir de `main` à jour.
2. Créer une branche `codex/<fonction>`.
3. Vérifier l’état réel du code avant modification.
4. Préserver les fonctions déjà validées.
5. Exécuter les validations avant fusion dans `main`.
