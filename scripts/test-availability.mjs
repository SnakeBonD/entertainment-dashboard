import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(path.join(projectRoot, "js/availability.js"));

const availability = globalThis.SnakeBonDAvailability;
const now = new Date("2026-09-07T10:00:00Z");
const items = [
  {
    id: "permanent",
    title: "Contenu permanent",
    type: "documentary",
    platform: "Source A",
    country: "FR",
    verified: true,
    expiryDate: null,
  },
  {
    id: "active",
    title: "Contenu actif",
    type: "movie",
    platform: "Source B",
    country: "FR",
    verified: true,
    expiryDate: "2026-09-20T22:00:00+02:00",
  },
  {
    id: "soon",
    title: "Contenu bientôt expiré",
    type: "tv",
    platform: "Source C",
    country: "FR",
    verified: true,
    expiryDate: "2026-09-10T22:00:00+02:00",
  },
  {
    id: "last-day",
    title: "Contenu dernier jour",
    type: "game",
    platform: "Source D",
    country: "FR",
    verified: true,
    expiryDate: "2026-09-08T08:00:00Z",
  },
  {
    id: "expired",
    title: "Contenu expiré",
    type: "movie",
    platform: "Source E",
    country: "FR",
    verified: true,
    expiryDate: "2026-09-06T22:00:00+02:00",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(availability.getStatus(items[0], now) === "permanent", "Le statut permanent est incorrect");
assert(availability.getStatus(items[1], now) === "active", "Le statut actif est incorrect");
assert(availability.getStatus(items[2], now) === "expiring_soon", "L’alerte à sept jours est incorrecte");
assert(availability.getStatus(items[3], now) === "expiring_today", "L’alerte des dernières 24 h est incorrecte");
assert(availability.getStatus(items[4], now) === "expired", "Le statut expiré est incorrect");

const summary = availability.summarize(items, now);
assert(summary.total === 5, "Le total de disponibilités est incorrect");
assert(summary.expiring === 2, "Le nombre de contenus bientôt indisponibles est incorrect");
assert(summary.expired === 1, "Le nombre de contenus expirés est incorrect");

const filtered = availability.filterItems(
  items,
  { search: "bientot", status: "expiring", type: "tv" },
  now,
);
assert(filtered.length === 1 && filtered[0].id === "soon", "Les filtres de disponibilité sont incorrects");

const result = availability.archiveExpired(
  { version: 4, lastUpdated: null, items },
  { version: 4, lastUpdated: null, items: [] },
  now,
);
assert(result.moved.length === 1, "Un seul contenu devait être archivé");
assert(result.catalogue.items.length === 4, "Le catalogue actif n’a pas été nettoyé");
assert(result.archive.items[0].id === "expired", "Le mauvais contenu a été archivé");
assert(result.archive.items[0].archiveReason === "expired", "La raison d’archivage est absente");

console.log("Tests v0.4 réussis : statuts, alertes, filtres et archivage conformes.");
