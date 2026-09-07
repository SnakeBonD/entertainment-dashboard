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
].forEach((id) => {
  assert(indexHtml.includes(`id="${id}"`), `index.html : contrôle #${id} absent`);
});

assert(indexHtml.includes("v0.3"), "index.html : version v0.3 absente");
assert(indexHtml.includes('id="pour-moi"'), "index.html : espace Pour moi absent");

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

if (catalogue) {
  ["movies", "tv", "games", "documentaries", "featured", "expiringSoon"].forEach((key) => {
    assert(Array.isArray(catalogue[key]), `catalogue.json : ${key} doit être un tableau`);
  });
}

const cname = fs.readFileSync(path.join(projectRoot, "CNAME"), "utf8").trim();
assert(cname === "entertainment.snakebond.net", "Le CNAME ne correspond pas au domaine prévu");

if (failures.length) {
  console.error("Validation échouée :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Validation réussie : 40 plateformes, données et structure conformes.");
