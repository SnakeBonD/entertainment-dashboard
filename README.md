# SnakeBonD Entertainment Dashboard

Dashboard personnel regroupant des contenus gratuits et légaux accessibles en France.

Production : <https://entertainment.snakebond.net>

## État du projet

La version **v2.1** ajoute des filtres rapides au tableau de bord Aujourd’hui :

- interface sombre responsive ;
- 40 plateformes officielles réparties en huit catégories ;
- recherche tolérante aux accents ;
- recherche globale avec filtres par type et accès direct aux résultats ;
- espace Aujourd’hui avec nouveautés, dernières chances, jeux Epic gratuits et podcasts récents ;
- filtres rapides Tout, Mes priorités, Nouveautés, Dernière chance, Epic Free et Podcasts ;
- contenus suivis et plateformes favorites placés en priorité ;
- filtres par catégorie, accès, compte, publicité et langue ;
- tris par sélection, nom ou date de vérification ;
- fiches enrichies avec badges et date de contrôle ;
- favoris conservés dans le navigateur ;
- contenus classés localement comme « À découvrir », « En cours », « Terminé » ou « Masqué » ;
- nouveautés comptées depuis la dernière visite et signalées dans la navigation ;
- alertes lorsque des contenus suivis ou issus d’une plateforme favorite arrivent à échéance ;
- agenda regroupé par jour avec périodes de 7, 14, 30 jours ou toutes les échéances ;
- vue limitée aux contenus suivis ou aux plateformes favorites ;
- compteurs dédiés aux échéances du jour, de la semaine et de la liste personnelle ;
- espace « Pour moi » avec accès direct aux favoris ;
- profil local par univers préférés et priorités d’accès ;
- classement personnalisé avec score et raisons visibles ;
- recommandations qui tiennent compte des favoris, du français, de la publicité et du compte ;
- module « Que regarder ce soir ? » relié à de vrais contenus vérifiés et à leurs plateformes ;
- choix direct du format et de la priorité du soir ;
- classement sensible à la durée, aux dates de fin, aux favoris et à la liste personnelle ;
- explication précise des critères retenus pour chaque suggestion ;
- export des favoris, préférences et contenus suivis dans un fichier daté ;
- validation stricte du format et nettoyage des valeurs avant importation ;
- aperçu du nombre d’éléments avant confirmation de la restauration ;
- retour aux données précédentes si une écriture locale échoue ;
- export de l’échéance d’un contenu précis depuis sa ligne d’agenda ;
- export groupé de toutes les échéances correspondant à la période et aux filtres affichés ;
- événements datés en UTC, triés, dédoublonnés et identifiés de manière stable ;
- fichiers ICS correctement échappés et pliés pour une large compatibilité calendrier ;
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
- import automatique des programmes de la sélection officielle « Les vidéos les plus vues sur ARTE » ;
- conservation des films, séries et documentaires réellement lisibles en France avec leur date de fin ;
- actualisation ARTE deux fois par jour, avec images, durées et liens officiels ;
- exclusion des collections sans date, contenus futurs, indisponibles ou géobloqués en France ;
- masquage de sécurité lorsqu’un programme quitte la sélection ARTE avant son expiration ;
- sélection automatique de six épisodes récents issus des flux officiels de France Culture et France Inter ;
- lecteur audio intégré, visuels, durées, dates de publication et liens vers Radio France ;
- contrôle de l’identité des flux, des domaines audio et des images avant toute publication ;
- actualisation des podcasts toutes les six heures sans inventer de date d’expiration ;
- installation depuis les navigateurs compatibles et lancement dans une fenêtre autonome ;
- interface, catalogue, favoris et préférences accessibles hors ligne après une première visite ;
- stratégie réseau prioritaire pour récupérer les contenus automatisés les plus récents dès que la connexion revient ;
- activation immédiate et contrôlée des nouvelles versions du cache applicatif ;
- état de connexion visible et périmètre hors ligne expliqué dans l’interface ;
- espace « Application » avec diagnostic de l’installation, du cache hors ligne et des mises à jour ;
- vérification manuelle d’une nouvelle version depuis le dashboard ;
- guides d’installation pour ordinateur, Android, iPhone et iPad ;
- URL canonique, métadonnées sociales, `robots.txt` et sitemap public ;
- navigation synchronisée dès l’accueil et transfert du focus vers le titre de chaque espace ;
- tableaux défilants utilisables au clavier, avec régions et légendes accessibles ;
- résultats dynamiques annoncés entièrement par les lecteurs d’écran ;
- recherches regroupées à la prochaine frame pour éviter les rendus intermédiaires inutiles ;
- chargement différé des scripts, images distantes et lecteurs audio certifié automatiquement ;
- espace « Application » enrichi avec l’état d’ARTE, Epic Games et Radio France ;
- dernier contrôle réussi, fréquence prévue et nombre d’éléments publiés affichés par source ;
- signalement automatique lorsqu’une source dépasse son délai normal d’actualisation ;
- conservation des derniers contenus validés lorsqu’un contrôle est en retard ;
- suivi de fraîcheur mis à jour par chaque automatisation réussie et disponible hors ligne ;
- synchronisations déclenchées uniquement par leur planification ou manuellement ;
- suppression des lancements simultanés provoqués par une modification technique ;
- un seul déploiement GitHub Pages déclenché explicitement après chaque publication automatisée ayant réellement modifié les données ;
- permissions GitHub Actions réduites au strict nécessaire pour les workflows de données ;
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
├── manifest.webmanifest
├── service-worker.js
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── pwa-icon.svg
│   ├── pwa-icon-192.png
│   └── pwa-icon-512.png
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── availability.js
│   ├── catalog.js
│   ├── calendar.js
│   ├── favorites.js
│   ├── preferences.js
│   ├── personalization.js
│   ├── pwa.js
│   ├── source-health.js
│   ├── recommendations.js
│   ├── backup.js
│   └── watchlist.js
├── data/
│   ├── archive.json
│   ├── catalogue.json
│   ├── platform-metadata.json
│   ├── platforms.json
│   ├── radio-france.json
│   ├── source-status.json
│   ├── recommendations.json
│   └── schedule.json
├── scripts/
│   ├── check-links.mjs
│   ├── archive-expired.mjs
│   ├── arte.mjs
│   ├── epic-games.mjs
│   ├── fetch-arte.mjs
│   ├── fetch-epic-games.mjs
│   ├── fetch-radio-france.mjs
│   ├── radio-france.mjs
│   ├── source-status.mjs
│   ├── test-availability.mjs
│   ├── test-agenda.mjs
│   ├── test-backup.mjs
│   ├── test-calendar.mjs
│   ├── test-chooser.mjs
│   ├── test-arte.mjs
│   ├── test-catalog.mjs
│   ├── test-epic-games.mjs
│   ├── test-personalization.mjs
│   ├── test-pwa.mjs
│   ├── test-quality.mjs
│   ├── test-source-health.mjs
│   ├── test-watchlist.mjs
│   ├── test-workflows.mjs
│   ├── test-release.mjs
│   ├── test-radio-france.mjs
│   └── validate.mjs
├── .github/workflows/
│   ├── archive-expired.yml
│   ├── check-links.yml
│   ├── fetch-arte.yml
│   ├── fetch-epic-games.yml
│   ├── fetch-radio-france.yml
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
node scripts/test-agenda.mjs
node scripts/test-backup.mjs
node scripts/test-calendar.mjs
node scripts/test-chooser.mjs
node scripts/test-epic-games.mjs
node scripts/test-arte.mjs
node scripts/test-radio-france.mjs
node scripts/test-pwa.mjs
node scripts/test-quality.mjs
node scripts/test-source-health.mjs
node scripts/test-watchlist.mjs
node scripts/test-workflows.mjs
node scripts/test-release.mjs
node --check js/app.js
node --check js/availability.js
node --check js/catalog.js
node --check js/favorites.js
node --check js/preferences.js
node --check js/personalization.js
node --check js/recommendations.js
node --check js/backup.js
node --check js/calendar.js
node --check js/pwa.js
node --check js/source-health.js
node --check js/watchlist.js
node --check service-worker.js
node --check scripts/epic-games.mjs
node --check scripts/fetch-epic-games.mjs
node --check scripts/arte.mjs
node --check scripts/fetch-arte.mjs
node --check scripts/radio-france.mjs
node --check scripts/fetch-radio-france.mjs
node --check scripts/source-status.mjs
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

### ARTE

`scripts/fetch-arte.mjs` consulte la page d’accueil officielle de l’API ARTE en français, y repère
la zone éditoriale « Les vidéos les plus vues », puis charge son contenu sans dépendre d’un
identifiant de zone figé.

Seuls les films, séries, émissions et documentaires dont la lecture est active et confirmée pour
la France sont conservés. Chaque entrée contient la période exacte de disponibilité, le visuel,
la durée, le lien vers le programme et la page officielle de la sélection.

Les collections sans date, les programmes à venir, les vidéos non lisibles, les liens non officiels
et les contenus exclus de France sont ignorés. Une réponse vide ou invalide interrompt la tâche sans
modifier les données déjà publiées.

### Radio France

`scripts/fetch-radio-france.mjs` consulte deux flux RSS officiels : **Les pieds sur terre** sur
France Culture et **Affaires sensibles** sur France Inter. Les trois épisodes les plus récents de
chaque émission alimentent `data/radio-france.json`.

Chaque épisode inclut le visuel Radio France, la durée, la date de publication, le lecteur audio
officiel et un lien vers l’émission ou sa page dédiée. L’import accepte uniquement les flux signés
Radio France, les fichiers audio servis par `proxycast.radiofrance.fr` et les images du domaine
officiel. Les contenus explicites, trop anciens, incomplets ou provenant d’un autre domaine sont
écartés.

Les podcasts restant accessibles après leur sortie de la sélection, aucune fausse date d’expiration
n’est créée. Une sélection incomplète ou un flux invalide interrompt la tâche sans remplacer les six
épisodes déjà publiés.

## Fraîcheur des sources

`data/source-status.json` conserve, pour ARTE, Epic Games Store et Radio France, la date du dernier
contrôle réussi, le nombre d’éléments confirmés, la fréquence prévue et le délai à partir duquel la
source doit être surveillée. Le dashboard transforme ces données en trois états simples : **À jour**,
**À surveiller** ou **En attente**.

Chaque import réussi actualise ce suivi même lorsque la sélection elle-même n’a pas changé. Si une
source ne répond plus, aucun contenu validé n’est supprimé : la date du dernier succès vieillit et
l’interface signale automatiquement le retard.

## Application installable et mode hors ligne

`manifest.webmanifest` décrit l’application, ses icônes adaptatives et ses raccourcis vers les
disponibilités, les podcasts et l’espace « Pour moi ». Le bouton « Installer l’app » apparaît quand
le navigateur propose l’installation. L’espace « Application » détaille l’état du cache, de
l’installation et des mises à jour, avec un contrôle manuel de la version publiée.

Sur iPhone et iPad, l’installation se fait manuellement dans Safari via **Partager**, puis
**Sur l’écran d’accueil**. Sur Android, Chrome propose l’installation dans son menu. Sur ordinateur,
Chrome et Edge peuvent afficher le bouton d’installation dans le dashboard ou la barre d’adresse.

`service-worker.js` précharge l’interface, les scripts et les fichiers JSON nécessaires. Chaque
requête locale donne d’abord la priorité au réseau afin de récupérer les données ARTE, Epic Games et
Radio France les plus récentes, puis utilise la copie enregistrée si le réseau est indisponible. Les
anciennes versions du cache sont supprimées à l’activation et la page se recharge une fois lorsqu’une
mise à jour prend le contrôle.

Le mode hors ligne couvre le dashboard et ses données locales. Les lecteurs audio, les visuels et les
pages des plateformes officielles restent externes et nécessitent une connexion.

`robots.txt`, `sitemap.xml` et les métadonnées du document déclarent l’unique URL publique canonique :
`https://entertainment.snakebond.net/`.

## Déploiement

Le workflow `deploy.yml` valide le site et le publie sur GitHub Pages après chaque push sur `main`. Le dépôt utilise **GitHub Actions** comme source de publication Pages.

Le fichier `CNAME` réserve le domaine `entertainment.snakebond.net`. Le domaine et son certificat HTTPS sont actifs.

Le workflow `check-links.yml` contrôle les 40 liens chaque lundi à 06 h 15 UTC. Il publie un
rapport dans le résumé GitHub Actions et conserve l’artefact pendant 30 jours. Une protection
anti-robot (`401`, `403` ou `429`) est signalée sans être assimilée à un lien supprimé.

Le workflow `archive-expired.yml` s’exécute chaque jour à 05 h 40 UTC. Il déplace une entrée dont
la date de fin est dépassée vers `data/archive.json`, valide les données, puis publie la mise à jour
uniquement si un changement est nécessaire.

Le workflow `fetch-epic-games.yml` s’exécute toutes les six heures ou sur lancement manuel. Il récupère les promotions
Epic Games pour la France, actualise le catalogue, archive les offres terminées et enregistre le
dernier contrôle réussi. Toutes les tâches de maintenance partagent la même file d’exécution afin
d’éviter les mises à jour concurrentes.

Le workflow `fetch-arte.yml` s’exécute toutes les douze heures ou sur lancement manuel. Il actualise la sélection ARTE pour
la France, archive les programmes expirés et enregistre le dernier contrôle réussi. Les imports
ARTE, Epic Games et l’archivage utilisent la même file de maintenance. Après chaque modification
automatique du catalogue, le push sur `main` déclenche une seule publication GitHub Pages. Un ordre
commun et déterministe évite qu’ARTE et Epic Games ne créent des
commits uniquement pour réordonner les mêmes entrées.

Le workflow `fetch-radio-france.yml` s’exécute toutes les six heures ou sur lancement manuel. Il contrôle les deux flux,
actualise les six épisodes sélectionnés et enregistre le dernier contrôle réussi.
Il partage la file de maintenance existante. Aucun workflow de données ne demande un second
déploiement : la publication normale de `main` suffit.

## Feuille de route

- **v0.1** — structure initiale et mise en production ;
- **v0.2** — catalogue enrichi, recherche, filtres, mobile et surveillance des liens ;
- **v0.3** — favoris, profil local et recommandations personnalisées ;
- **v0.4** — dates d’expiration, alertes et archivage automatique ;
- **v0.5** — automatisation des jeux Epic Games, contrôle des offres et images officielles ;
- **v0.6** — automatisation des sélections ARTE, contrôle géographique et dates de disponibilité ;
- **v0.7** — podcasts Radio France automatisés depuis deux flux officiels ;
- **v0.8** — PWA installable, mode hors ligne maîtrisé et mise à jour réseau prioritaire ;
- **v1.0** — version stable, installation guidée, diagnostic PWA et métadonnées publiques.
- **v1.1** — accessibilité clavier, gestion du focus et optimisation des recherches et médias.
- **v1.2** — état des sources, suivi du dernier contrôle réussi et détection des retards.
- **v1.3** — planifications isolées, permissions réduites et déploiements redondants supprimés.
- **v1.4** — liste personnelle locale, nouveautés depuis la dernière visite et alertes ciblées.
- **v1.5** — agenda des disponibilités par date, période et priorité personnelle.
- **v1.6** — choix du soir enrichi, contenus datés prioritaires et explications détaillées.
- **v1.7** — export et import sécurisés des favoris, préférences et contenus suivis.
- **v1.8** — export ICS d’une échéance ou de l’agenda filtré vers une application de calendrier.
- **v1.9** — recherche globale unifiée des plateformes, contenus datés et podcasts.
- **v2.0** — tableau de bord Aujourd’hui et priorisation personnelle locale.
- **v2.1** — filtres rapides pour cibler immédiatement les suggestions du jour.

## Sécurité et confidentialité

- Aucun secret ou identifiant dans le dépôt.
- Aucun tracker ni cookie publicitaire propre au dashboard.
- Favoris stockés uniquement dans `localStorage`.
- Préférences stockées uniquement dans `localStorage`, indépendamment des favoris.
- Liste personnelle et date de dernière visite stockées uniquement dans `localStorage`.
- Calcul des recommandations effectué dans le navigateur, avec raisons affichées.
- Aucun contenu daté n’est affiché sans vérification et source officielle.
- Une entrée expirée est conservée dans l’archive au lieu d’être supprimée.
- L’import Epic Games utilise uniquement des données officielles destinées à la France.
- L’import ARTE accepte uniquement des programmes actifs, lisibles et autorisés en France.
- L’import Radio France accepte uniquement les flux, audios, images et liens des domaines officiels.
- Une réponse vide ou invalide ne peut pas effacer les données déjà publiées.
- Liens limités aux plateformes officielles sélectionnées.

## Méthode de contribution

1. Partir de `main` à jour.
2. Créer une branche `codex/<fonction>`.
3. Vérifier l’état réel du code avant modification.
4. Préserver les fonctions déjà validées.
5. Exécuter les validations avant fusion dans `main`.
