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
  "data/platform-metadata.json",
  "data/platforms.json",
  "data/recommendations.json",
  "data/schedule.json",
  "data/catalogue.json",
  "data/archive.json",
  "scripts/archive-expired.mjs",
  "scripts/test-availability.mjs",
  ".github/workflows/archive-expired.yml",
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
].forEach((id) => {
  assert(indexHtml.includes(`id="${id}"`), `index.html : contrôle #${id} absent`);
});

assert(indexHtml.includes("v0.4"), "index.html : version v0.4 absente");
assert(indexHtml.includes('id="pour-moi"'), "index.html : espace Pour moi absent");
assert(indexHtml.includes('id="disponibilites"'), "index.html : espace Disponibilités absent");

const localAssets = [...indexHtml.matchAll(/(?:src|href)="((?:css|js|data)\/[^"?#]+)"/g)]
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

  if (archived) {
    assert(validDate(item?.archivedAt), `${label} possède une date d’archivage invalide`);
    assert(item?.archiveReason === "expired", `${label} possède une raison d’archivage invalide`);
  }
}

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

const cname = fs.readFileSync(path.join(projectRoot, "CNAME"), "utf8").trim();
assert(cname === "entertainment.snakebond.net", "Le CNAME ne correspond pas au domaine prévu");

if (failures.length) {
  console.error("Validation échouée :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Validation réussie : 40 plateformes, disponibilités, archives et structure conformes.");
