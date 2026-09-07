import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(path.join(projectRoot, "js/catalog.js"));
await import(path.join(projectRoot, "js/preferences.js"));
await import(path.join(projectRoot, "js/personalization.js"));
await import(path.join(projectRoot, "js/recommendations.js"));

const platforms = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/platforms.json"), "utf8"));
const metadata = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/platform-metadata.json"), "utf8"),
);
const recommendations = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/recommendations.json"), "utf8"),
);
const categories = Object.keys(platforms);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const clean = globalThis.SnakeBonDPreferences.sanitize({
  categories: ["Jeux", "Jeux", "Catégorie inconnue"],
  priorities: { french: true, noAds: "oui", noAccount: true },
}, categories);
assert(clean.categories.length === 1 && clean.categories[0] === "Jeux", "Le profil accepte une catégorie invalide");
assert(clean.priorities.french === true, "La priorité français n’est pas conservée");
assert(clean.priorities.noAds === false, "Une priorité non booléenne a été acceptée");

const gameProfile = {
  categories: ["Jeux"],
  priorities: { french: false, noAds: false, noAccount: false },
};
const gameMatches = globalThis.SnakeBonDPersonalization.rankPlatforms({
  platforms,
  metadata,
  preferences: gameProfile,
  limit: 5,
});
assert(gameMatches.every(({ category }) => category === "Jeux"), "L’univers préféré ne remonte pas en priorité");

const privacyProfile = {
  categories: [],
  priorities: { french: true, noAds: true, noAccount: true },
};
const privacyMatches = globalThis.SnakeBonDPersonalization.rankPlatforms({
  platforms,
  metadata,
  preferences: privacyProfile,
  limit: 6,
});
assert(privacyMatches.every(({ meta }) => meta.ads === false), "La priorité sans publicité est mal classée");
assert(privacyMatches[0].meta.languages.includes("fr"), "La priorité français est mal classée");
assert(privacyMatches[0].meta.account === "none", "La priorité sans compte est mal classée");

const favoriteMatches = globalThis.SnakeBonDPersonalization.rankPlatforms({
  platforms,
  metadata,
  preferences: globalThis.SnakeBonDPreferences.defaults(),
  isFavorite: (category, name) => category === "Films" && name === "Pluto TV",
  limit: 1,
});
assert(favoriteMatches[0].platform.name === "Pluto TV", "Un favori n’est pas prioritaire");
assert(favoriteMatches[0].reasons.includes("Déjà dans tes favoris"), "La raison favori est absente");

const values = {
  mood: "curieux",
  time: "moins de 30 min",
  energy: "moyenne",
  company: "seul",
};
const suggestions = globalThis.SnakeBonDRecommendations.buildSuggestions({
  values,
  recommendations,
  platforms,
  metadata,
  preferences: privacyProfile,
  isFavorite: () => false,
});
assert(suggestions.length === 5, "Le sélecteur doit produire cinq suggestions");
assert(suggestions[0].type === "podcast", "Un format court doit commencer par un podcast");
assert(suggestions[0].match.category === "Podcasts", "La plateforme du podcast est incohérente");
assert(suggestions.every(({ match }) => match?.platform.url), "Une suggestion n’a pas de lien officiel");

console.log("Tests v0.3 réussis : préférences, classement, favoris et choix du soir conformes.");
