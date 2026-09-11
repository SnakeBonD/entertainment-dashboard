import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(path.join(projectRoot, "js/catalog.js"));
await import(path.join(projectRoot, "js/availability.js"));
await import(path.join(projectRoot, "js/personalization.js"));
await import(path.join(projectRoot, "js/recommendations.js"));

const platforms = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/platforms.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/platform-metadata.json"), "utf8"));
const recommendations = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/recommendations.json"), "utf8"));
const now = new Date("2026-09-11T12:00:00Z");
const catalogue = {
  items: [
    {
      id: "urgent-movie",
      title: "Film urgent",
      type: "movie",
      platform: "ARTE",
      url: "https://example.com/urgent",
      country: "FR",
      verified: true,
      expiryDate: "2026-09-15T12:00:00Z",
      durationLabel: "90 min",
    },
    {
      id: "tracked-movie",
      title: "Film suivi",
      type: "movie",
      platform: "France.tv",
      url: "https://example.com/tracked",
      country: "FR",
      verified: true,
      expiryDate: "2027-01-15T12:00:00Z",
      durationLabel: "95 min",
    },
  ],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function choose(priority, getWatchlistStatus = () => null) {
  return globalThis.SnakeBonDRecommendations.buildSuggestions({
    values: {
      mood: "curieux",
      time: "1 à 2 h",
      energy: "moyenne",
      company: "seul",
      format: "movie",
      priority,
    },
    recommendations,
    platforms,
    metadata,
    catalogue,
    preferences: { categories: [], priorities: {} },
    isFavorite: () => false,
    getWatchlistStatus,
    now,
  });
}

const deadline = choose("deadline");
assert(deadline.length === 5, "Le sélecteur doit conserver cinq suggestions");
assert(deadline[0].type === "movie", "Le format demandé doit arriver en premier");
assert(deadline[0].content.item.id === "urgent-movie", "L’échéance proche doit être prioritaire");
assert(deadline[0].content.reasons.includes("Durée adaptée · 90 min"), "La raison liée à la durée est absente");
assert(deadline[0].content.reasons.some((reason) => reason.includes("4 prochains jours")), "La raison liée à l’échéance est absente");

const personal = choose("personal", (id) => id === "tracked-movie" ? "progress" : null);
assert(personal[0].content.item.id === "tracked-movie", "Un contenu suivi doit être prioritaire en mode personnel");
assert(personal[0].content.reasons.includes("Déjà commencé"), "La raison liée au suivi est absente");

assert(
  globalThis.SnakeBonDRecommendations.durationFits("24 min", "moins de 30 min"),
  "Une durée courte devrait correspondre au créneau court",
);
assert(
  !globalThis.SnakeBonDRecommendations.durationFits("90 min", "moins de 30 min"),
  "Une durée longue ne devrait pas correspondre au créneau court",
);

console.log("Tests v1.6 réussis : format, durée, échéance, liste personnelle et explications conformes.");
