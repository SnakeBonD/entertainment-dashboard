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
  "js/favorites.js",
  "js/recommendations.js",
  "data/platforms.json",
  "data/recommendations.json",
  "data/schedule.json",
  "data/catalogue.json",
  "CNAME",
];

requiredFiles.forEach((relativePath) => {
  assert(fs.existsSync(path.join(projectRoot, relativePath)), `${relativePath} est absent`);
});

const platforms = readJson("data/platforms.json");
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
