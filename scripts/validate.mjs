import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  assert(fs.existsSync(absolutePath), `${relativePath} est absent`);
  if (!fs.existsSync(absolutePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath} contient un JSON invalide : ${error.message}`);
    return null;
  }
}

const requiredFiles = [
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/availability.js",
  "js/catalog.js",
  "js/favorites.js",
  "js/preferences.js",
  "js/personalization.js",
  "js/recommendations.js",
  "js/pwa.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets/pwa-icon.svg",
  "assets/pwa-icon-192.png",
  "assets/pwa-icon-512.png",
  "data/platform-metadata.json",
  "data/platforms.json",
  "data/recommendations.json",
  "data/schedule.json",
  "data/catalogue.json",
  "data/archive.json",
  "data/radio-france.json",
  "scripts/archive-expired.mjs",
  "scripts/test-availability.mjs",
  "scripts/epic-games.mjs",
  "scripts/fetch-epic-games.mjs",
  "scripts/test-epic-games.mjs",
  "scripts/arte.mjs",
  "scripts/fetch-arte.mjs",
  "scripts/test-arte.mjs",
  "scripts/radio-france.mjs",
  "scripts/fetch-radio-france.mjs",
  "scripts/test-radio-france.mjs",
  "scripts/test-pwa.mjs",
  ".github/workflows/archive-expired.yml",
  ".github/workflows/fetch-epic-games.yml",
  ".github/workflows/fetch-arte.yml",
  ".github/workflows/fetch-radio-france.yml",
  ".github/workflows/deploy.yml",
  "CNAME",
];

requiredFiles.forEach((relativePath) => {
  assert(fs.existsSync(path.join(projectRoot, relativePath)), `${relativePath} est absent`);
});

const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
[
  "menu-toggle",
  "main-nav",
  "platform-search",
  "category-filters",
  "advanced-filters",
  "access-filter",
  "account-filter",
  "ads-filter",
  "language-filter",
  "sort-filter",
  "reset-filters",
  "platform-container",
  "preferences-form",
  "preference-categories",
  "personal-recommendations",
  "personal-favorites",
  "reset-preferences",
  "availability-search",
  "availability-status-filter",
  "availability-type-filter",
  "availability-container",
  "archive-container",
  "radio-france-selection",
  "radio-france-last-updated",
  "install-app",
  "connection-status",
].forEach((id) => {
  assert(indexHtml.includes(`id="${id}"`), `index.html : contrôle #${id} absent`);
});

assert(indexHtml.includes("v0.8"), "index.html : version v0.8 absente");
assert(indexHtml.includes('id="pour-moi"'), "index.html : espace Pour moi absent");
assert(indexHtml.includes('id="disponibilites"'), "index.html : espace Disponibilités absent");
assert(indexHtml.includes('rel="manifest" href="manifest.webmanifest"'), "index.html : manifeste PWA absent");
assert(indexHtml.includes('src="js/pwa.js"'), "index.html : contrôleur PWA absent");

const localAssets = [...indexHtml.matchAll(/(?:src|href)="((?:css|js|data|assets)\/[^"?#]+|manifest\.webmanifest)"/g)]
  .map((match) => match[1]);
localAssets.forEach((relativePath) => {
  assert(fs.existsSync(path.join(projectRoot, relativePath)), `Ressource locale absente : ${relativePath}`);
});

const platforms = readJson("data/platforms.json");
const platformMetadata = readJson("data/platform-metadata.json");
const recommendations = readJson("data/recommendations.json");
const schedule = readJson("data/schedule.json");
const catalogue = readJson("data/catalogue.json");
const archive = readJson("data/archive.json");
const radioFrance = readJson("data/radio-france.json");

if (platforms) {
  const entries = Object.entries(platforms);
  const platformList = entries.flatMap(([, items]) => items);
  assert(entries.length === 8, `8 catégories attendues, ${entries.length} trouvées`);
  assert(platformList.length === 40, `40 plateformes attendues, ${platformList.length} trouvées`);

  platformList.forEach((platform) => {
    assert(Boolean(platform.name), "Une plateforme n’a pas de nom");
    assert(Boolean(platform.best), `${platform.name ?? "Plateforme"} n’a pas de description`);
    assert(Boolean(platform.premium), `${platform.name ?? "Plateforme"} n’a pas de conseil premium`);
    try {
      const url = new URL(platform.url);
      assert(url.protocol === "https:", `${platform.name ?? "Plateforme"} n’utilise pas HTTPS`);
    } catch {
      failures.push(`${platform.name ?? "Plateforme"} possède une URL invalide`);
    }
  });
}

if (platforms && platformMetadata) {
  const expectedKeys = Object.entries(platforms).flatMap(([category, items]) =>
    items.map((platform) => `${category}::${platform.name}`),
  );
  const metadataEntries = Object.entries(platformMetadata.platforms ?? {});
  const metadataKeys = metadataEntries.map(([key]) => key);
  const accessValues = new Set([
    "free",
    "ad_supported",
    "freemium",
    "public_service",
    "public_domain",
    "open_source",
  ]);
  const accountValues = new Set(["none", "optional", "required"]);

  assert(platformMetadata.version === 2, "platform-metadata.json : version 2 attendue");
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(platformMetadata.lastVerified ?? ""),
    "platform-metadata.json : date globale de vérification invalide",
  );
  assert(metadataEntries.length === 40, `40 métadonnées attendues, ${metadataEntries.length} trouvées`);

  expectedKeys.forEach((key) => {
    assert(metadataKeys.includes(key), `Métadonnées absentes pour ${key}`);
  });
  metadataKeys.forEach((key) => {
    assert(expectedKeys.includes(key), `Métadonnées orphelines pour ${key}`);
  });

  metadataEntries.forEach(([key, meta]) => {
    assert(accessValues.has(meta.access), `${key} possède un type d’accès invalide`);
    assert(accountValues.has(meta.account), `${key} possède une règle de compte invalide`);
    assert(typeof meta.ads === "boolean", `${key} doit préciser la présence de publicité`);
    assert(meta.france === true, `${key} doit être disponible en France`);
    assert(Array.isArray(meta.languages) && meta.languages.length > 0, `${key} n’a pas de langue`);
    assert(Array.isArray(meta.tags) && meta.tags.length > 0, `${key} n’a pas de tags de recherche`);
  });
}

if (recommendations) {
  assert(Object.keys(recommendations).length === 5, "5 profils de recommandation sont attendus");
}

if (schedule) {
  assert(schedule.music?.length === 7, "La station musique doit contenir 7 jours");
  assert(schedule.youtube?.length === 7, "Le programme YouTube doit contenir 7 jours");
  assert(schedule.learning?.length === 7, "Le programme d’apprentissage doit contenir 7 jours");
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateContentItem(item, source, archived = false) {
  const label = `${source} : ${item?.id ?? "entrée sans identifiant"}`;
  assert(typeof item?.id === "string" && item.id.length > 0, `${label} n’a pas d’identifiant`);
  assert(typeof item?.title === "string" && item.title.length > 0, `${label} n’a pas de titre`);
  assert(["movie", "tv", "game", "documentary"].includes(item?.type), `${label} possède un type invalide`);
  assert(typeof item?.platform === "string" && item.platform.length > 0, `${label} n’a pas de plateforme`);
  assert(item?.country === "FR", `${label} doit cibler la France`);
  assert(typeof item?.verified === "boolean", `${label} doit préciser son état de vérification`);
  assert(validDate(item?.verifiedAt), `${label} possède une date de vérification invalide`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item?.addedDate ?? ""), `${label} possède une date d’ajout invalide`);
  assert(item?.expiryDate === null || validDate(item?.expiryDate), `${label} possède une date d’expiration invalide`);

  ["url", "sourceUrl"].forEach((field) => {
    try {
      const url = new URL(item?.[field]);
      assert(url.protocol === "https:", `${label} : ${field} doit utiliser HTTPS`);
    } catch {
      failures.push(`${label} : ${field} est invalide`);
    }
  });

  if (item?.provider === "epic-games-store") {
    assert(/^epic-.+-\d{4}-\d{2}-\d{2}$/.test(item.id), `${label} possède un identifiant Epic invalide`);
    assert(item.type === "game", `${label} doit être un jeu`);
    assert(item.platform === "Epic Games Store", `${label} possède une plateforme Epic invalide`);
    assert(typeof item.externalId === "string" && item.externalId.length > 0, `${label} n’a pas d’identifiant source`);
    assert(validDate(item.promotionStartDate), `${label} possède une date de début invalide`);
    assert(validDate(item.expiryDate), `${label} doit posséder une date de fin`);
    assert(
      Date.parse(item.expiryDate) > Date.parse(item.promotionStartDate),
      `${label} possède une période promotionnelle invalide`,
    );
    assert(typeof item.originalPrice === "string" && item.originalPrice.length > 0, `${label} n’a pas de prix habituel`);
    try {
      const image = new URL(item.imageUrl);
      assert(image.protocol === "https:", `${label} : imageUrl doit utiliser HTTPS`);
    } catch {
      failures.push(`${label} : imageUrl est invalide`);
    }
    try {
      const product = new URL(item.url);
      const officialSource = new URL(item.sourceUrl);
      assert(product.hostname === "store.epicgames.com", `${label} : URL produit non officielle`);
      assert(officialSource.hostname === "store.epicgames.com", `${label} : source non officielle`);
    } catch {
      failures.push(`${label} : domaine Epic Games invalide`);
    }
    if (item.verified === false) {
      assert(
        item.verificationNote === "not_in_current_feed",
        `${label} : une offre masquée doit préciser sa raison`,
      );
    }
  }

  if (item?.provider === "arte") {
    assert(/^arte-.+-\d{4}-\d{2}-\d{2}$/.test(item.id), `${label} possède un identifiant ARTE invalide`);
    assert(["movie", "tv", "documentary"].includes(item.type), `${label} possède un type ARTE invalide`);
    assert(item.platform === "ARTE", `${label} possède une plateforme ARTE invalide`);
    assert(typeof item.externalId === "string" && item.externalId.length > 0, `${label} n’a pas d’identifiant source ARTE`);
    assert(validDate(item.availabilityStartDate), `${label} possède une date de début ARTE invalide`);
    assert(validDate(item.expiryDate), `${label} doit posséder une date de fin ARTE`);
    assert(
      Date.parse(item.expiryDate) > Date.parse(item.availabilityStartDate),
      `${label} possède une période ARTE invalide`,
    );
    assert(item.selectionLabel === "Les vidéos les plus vues sur ARTE", `${label} possède une sélection ARTE invalide`);
    try {
      const image = new URL(item.imageUrl);
      assert(image.hostname === "api-cdn.arte.tv", `${label} : image ARTE non officielle`);
    } catch {
      failures.push(`${label} : imageUrl ARTE est invalide`);
    }
    try {
      const product = new URL(item.url);
      const officialSource = new URL(item.sourceUrl);
      assert(product.hostname === "www.arte.tv", `${label} : URL programme ARTE non officielle`);
      assert(officialSource.hostname === "www.arte.tv", `${label} : source ARTE non officielle`);
    } catch {
      failures.push(`${label} : domaine ARTE invalide`);
    }
    if (item.verified === false) {
      assert(
        item.verificationNote === "not_in_current_selection",
        `${label} : un programme ARTE masqué doit préciser sa raison`,
      );
    }
  }

  if (archived) {
    assert(validDate(item?.archivedAt), `${label} possède une date d’archivage invalide`);
    assert(item?.archiveReason === "expired", `${label} possède une raison d’archivage invalide`);
  }
}

const epicWorkflow = fs.readFileSync(
  path.join(projectRoot, ".github/workflows/fetch-epic-games.yml"),
  "utf8",
);
assert(epicWorkflow.includes('cron: "23 */6 * * *"'), "Le rythme de synchronisation Epic Games est absent");
assert(epicWorkflow.includes("scripts/fetch-epic-games.mjs"), "Le workflow Epic Games n’exécute pas l’import");

const arteWorkflow = fs.readFileSync(
  path.join(projectRoot, ".github/workflows/fetch-arte.yml"),
  "utf8",
);
assert(arteWorkflow.includes('cron: "41 */12 * * *"'), "Le rythme de synchronisation ARTE est absent");
assert(arteWorkflow.includes("scripts/fetch-arte.mjs"), "Le workflow ARTE n’exécute pas l’import");
assert(arteWorkflow.includes("group: catalogue-maintenance"), "Le workflow ARTE ne partage pas la file de maintenance");

const radioFranceWorkflow = fs.readFileSync(
  path.join(projectRoot, ".github/workflows/fetch-radio-france.yml"),
  "utf8",
);
assert(
  radioFranceWorkflow.includes('cron: "17 */6 * * *"'),
  "Le rythme de synchronisation Radio France est absent",
);
assert(
  radioFranceWorkflow.includes("scripts/fetch-radio-france.mjs"),
  "Le workflow Radio France n’exécute pas l’import",
);
assert(
  radioFranceWorkflow.includes("group: catalogue-maintenance"),
  "Le workflow Radio France ne partage pas la file de maintenance",
);

const archiveWorkflow = fs.readFileSync(
  path.join(projectRoot, ".github/workflows/archive-expired.yml"),
  "utf8",
);

[
  ["ARTE", arteWorkflow],
  ["Epic Games", epicWorkflow],
  ["Radio France", radioFranceWorkflow],
  ["Archivage", archiveWorkflow],
].forEach(([name, workflow]) => {
  assert(workflow.includes("actions: write"), `Le workflow ${name} ne peut pas relancer le déploiement`);
  assert(workflow.includes("id: publish"), `Le workflow ${name} ne signale pas ses changements`);
  assert(workflow.includes('changed=true'), `Le workflow ${name} ne détecte pas une mise à jour publiée`);
  assert(
    workflow.includes("gh workflow run deploy.yml --ref main"),
    `Le workflow ${name} ne redéploie pas le catalogue mis à jour`,
  );
});

if (catalogue && archive) {
  assert(catalogue.version === 4, "catalogue.json : version 4 attendue");
  assert(archive.version === 4, "archive.json : version 4 attendue");
  assert(Array.isArray(catalogue.items), "catalogue.json : items doit être un tableau");
  assert(Array.isArray(archive.items), "archive.json : items doit être un tableau");
  assert(catalogue.lastUpdated === null || validDate(catalogue.lastUpdated), "catalogue.json : lastUpdated invalide");
  assert(archive.lastUpdated === null || validDate(archive.lastUpdated), "archive.json : lastUpdated invalide");

  (catalogue.items ?? []).forEach((item) => validateContentItem(item, "catalogue.json"));
  (archive.items ?? []).forEach((item) => validateContentItem(item, "archive.json", true));

  const ids = [...(catalogue.items ?? []), ...(archive.items ?? [])].map((item) => item.id);
  assert(new Set(ids).size === ids.length, "Un identifiant de contenu est présent plusieurs fois");
}

if (radioFrance) {
  assert(radioFrance.version === 1, "radio-france.json : version 1 attendue");
  assert(validDate(radioFrance.lastUpdated), "radio-france.json : lastUpdated invalide");
  assert(Array.isArray(radioFrance.items), "radio-france.json : items doit être un tableau");
  assert(radioFrance.items?.length === 6, "radio-france.json : 6 épisodes sont attendus");

  const radioIds = (radioFrance.items ?? []).map((item) => item.id);
  assert(new Set(radioIds).size === radioIds.length, "radio-france.json contient un épisode en double");

  (radioFrance.items ?? []).forEach((item) => {
    const label = `radio-france.json : ${item?.id ?? "entrée sans identifiant"}`;
    assert(
      /^radio-france-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item?.id ?? ""),
      `${label} possède un identifiant invalide`,
    );
    assert(item.provider === "radio-france", `${label} possède un fournisseur invalide`);
    assert(["France Culture", "France Inter"].includes(item.station), `${label} possède une station invalide`);
    assert(typeof item.title === "string" && item.title.length > 0, `${label} n’a pas de titre`);
    assert(typeof item.podcastTitle === "string" && item.podcastTitle.length > 0, `${label} n’a pas d’émission`);
    assert(typeof item.description === "string" && item.description.length > 0, `${label} n’a pas de description`);
    assert(typeof item.durationLabel === "string" && item.durationLabel.length > 0, `${label} n’a pas de durée`);
    assert(validDate(item.publishedAt), `${label} possède une date de publication invalide`);
    assert(validDate(item.verifiedAt), `${label} possède une date de vérification invalide`);

    [
      ["url", "www.radiofrance.fr", null],
      ["audioUrl", "proxycast.radiofrance.fr", null],
      ["imageUrl", "www.radiofrance.fr", "/s3/"],
      ["sourceUrl", "radiofrance-podcast.net", "/podcast09/"],
    ].forEach(([field, hostname, pathPrefix]) => {
      try {
        const url = new URL(item[field]);
        assert(url.protocol === "https:", `${label} : ${field} doit utiliser HTTPS`);
        assert(url.hostname === hostname, `${label} : ${field} n’est pas une source Radio France officielle`);
        if (pathPrefix) assert(url.pathname.startsWith(pathPrefix), `${label} : ${field} possède un chemin invalide`);
      } catch {
        failures.push(`${label} : ${field} est invalide`);
      }
    });
  });
}

const cname = fs.readFileSync(path.join(projectRoot, "CNAME"), "utf8").trim();
assert(cname === "entertainment.snakebond.net", "Le CNAME ne correspond pas au domaine prévu");

if (failures.length) {
  console.error("Validation échouée :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Validation réussie : 40 plateformes, catalogue v0.8, PWA, automatisations et structure conformes.");
