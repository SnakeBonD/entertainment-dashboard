import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(path.join(projectRoot, "js/catalog.js"));

const catalog = globalThis.SnakeBonDCatalog;
const platforms = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/platforms.json"), "utf8"));
const metadata = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/platform-metadata.json"), "utf8"),
);

const entries = Object.entries(platforms).flatMap(([category, items]) =>
  items.map((platform) => ({
    category,
    platform,
    meta: catalog.getMetadata(metadata, category, platform),
  })),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const defaultFilters = {
  category: "Tous",
  favoritesOnly: false,
  search: "",
  access: "all",
  account: "all",
  ads: "all",
  language: "all",
  sort: "recommended",
};

const filter = (changes) => entries.filter(({ category, platform, meta }) =>
  catalog.matches({
    category,
    platform,
    meta,
    filters: { ...defaultFilters, ...changes },
    isFavorite: platform.name === "ARTE",
  }),
);

assert(entries.length === 40, "Le catalogue de test doit contenir 40 plateformes");
assert(filter({ category: "Jeux" }).length === 5, "Le filtre de catégorie Jeux doit retourner 5 entrées");
assert(filter({ ads: "no" }).every(({ meta }) => meta.ads === false), "Le filtre sans publicité est incorrect");
assert(filter({ account: "none" }).every(({ meta }) => meta.account === "none"), "Le filtre sans compte est incorrect");
assert(filter({ language: "fr" }).every(({ meta }) => meta.languages.includes("fr")), "Le filtre français est incorrect");
assert(filter({ language: "multi" }).every(({ meta }) => meta.languages.length > 1), "Le filtre multilingue est incorrect");
assert(filter({ search: "cybersecurite" }).length >= 2, "La recherche sans accent ne trouve pas la cybersécurité");
assert(filter({ favoritesOnly: true }).length === 1, "Le filtre des favoris est incorrect");

const sorted = catalog.sortPlatforms(entries, "name");
assert(
  sorted.every((entry, index) =>
    index === 0 || sorted[index - 1].platform.name.localeCompare(entry.platform.name, "fr") <= 0,
  ),
  "Le tri A–Z est incorrect",
);
assert(catalog.activeFilterCount(defaultFilters) === 0, "Les filtres par défaut ne doivent pas être actifs");
assert(catalog.activeFilterCount({ ...defaultFilters, ads: "no", search: "arte" }) === 2, "Le compteur de filtres est incorrect");

console.log("Tests catalogue réussis : recherche, filtres, tri et favoris conformes.");
