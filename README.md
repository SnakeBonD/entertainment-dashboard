# SnakeBonD Entertainment Dashboard

Dashboard personnel regroupant des contenus gratuits et légaux accessibles en France.

Production : <https://entertainment.snakebond.net>

## État du projet

La branche `codex/initial-dashboard` contient la première structure maintenable issue du dashboard HTML local :

- interface sombre responsive ;
- 40 plateformes officielles réparties en huit catégories ;
- recherche et filtres par catégorie ;
- favoris conservés dans le navigateur ;
- station musicale hebdomadaire ;
- programmes YouTube, podcasts, apprentissage et week-end ;
- module « Que regarder ce soir ? » ;
- données séparées du code et prêtes pour les futures mises à jour automatiques.

Les anciens titres de films datés du 17 juillet 2026 ne sont pas présentés comme encore disponibles. Les futurs contenus du catalogue seront affichés seulement après vérification.

## Architecture

```text
entertainment-dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── favorites.js
│   └── recommendations.js
├── data/
│   ├── archive.json
│   ├── catalogue.json
│   ├── platforms.json
│   ├── recommendations.json
│   └── schedule.json
├── assets/
│   ├── icons/
│   └── images/
├── scripts/
│   └── validate.mjs
├── .github/workflows/
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
node --check js/app.js
node --check js/favorites.js
node --check js/recommendations.js
```

## Données

`data/platforms.json` contient le répertoire permanent des plateformes.

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

Le workflow `deploy.yml` valide le site et le publie sur GitHub Pages après chaque push sur `main`. Le dépôt doit utiliser **GitHub Actions** comme source de publication Pages.

Le fichier `CNAME` réserve le domaine `entertainment.snakebond.net`. La valeur DNS définitive sera configurée uniquement après confirmation de l’adresse GitHub Pages du dépôt.

## Sécurité et confidentialité

- Aucun secret ou identifiant dans le dépôt.
- Aucun tracker ni cookie publicitaire propre au dashboard.
- Favoris stockés uniquement dans `localStorage`.
- Liens limités aux plateformes officielles sélectionnées.

## Méthode de contribution

1. Partir de `main` à jour.
2. Créer une branche `codex/<fonction>`.
3. Vérifier l’état réel du code avant modification.
4. Préserver les fonctions déjà validées.
5. Exécuter les validations avant fusion dans `main`.
