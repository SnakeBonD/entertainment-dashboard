const memory = new Map();
let blockedKey = null;
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    if (key === blockedKey) throw new Error("quota");
    memory.set(key, String(value));
  },
  removeItem: (key) => memory.delete(key),
};
globalThis.window = globalThis;
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};

await import("../js/favorites.js");
await import("../js/preferences.js");
await import("../js/watchlist.js");
await import("../js/today-program.js");
await import("../js/backup.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const allowedCategories = ["Films", "Jeux"];
const source = globalThis.SnakeBonDBackup.build({
  favorites: ["Films::ARTE", "Films::ARTE", "invalide"],
  preferences: {
    categories: ["Films", "Catégorie inconnue"],
    priorities: { french: true, noAds: false, noAccount: true },
  },
  watchlist: {
    valid: { status: "progress", title: "Film test", platform: "ARTE", updatedAt: "2026-09-11T12:00:00Z" },
    invalid: { status: "unknown", title: "À rejeter" },
  },
  todayProgram: {
    budget: 90,
    items: [{ id: "programme-1", title: "Choix du soir", url: "https://example.com/programme-1", durationMinutes: 60, done: true }],
  },
}, new Date("2026-09-11T12:00:00Z"));

const parsed = globalThis.SnakeBonDBackup.parse(JSON.stringify(source), { allowedCategories });
const summary = globalThis.SnakeBonDBackup.summarize(parsed);
assert(parsed.data.favorites.length === 1, "Les favoris importés ne sont pas nettoyés");
assert(parsed.data.preferences.categories.length === 1, "Une catégorie inconnue a été importée");
assert(Object.keys(parsed.data.watchlist).length === 1, "Un statut de suivi invalide a été importé");
assert(parsed.version === 2, "La sauvegarde exportée devrait utiliser le schéma v2");
assert(parsed.data.todayProgram.budget === 90 && parsed.data.todayProgram.items[0].done, "Le programme du jour n’a pas été nettoyé");
assert(summary.favorites === 1 && summary.preferences === 3 && summary.watchlist === 1 && summary.todayProgram === 1 && summary.todayBudget === 90, "Le résumé de sauvegarde est incorrect");
assert(globalThis.SnakeBonDBackup.apply(parsed, { allowedCategories }), "La restauration valide a échoué");
assert(globalThis.SnakeBonDFavorites.entries()[0] === "Films::ARTE", "Les favoris n’ont pas été restaurés");
assert(globalThis.SnakeBonDPreferences.read(allowedCategories).priorities.french, "Les préférences n’ont pas été restaurées");
assert(globalThis.SnakeBonDWatchlist.get("valid").status === "progress", "La liste personnelle n’a pas été restaurée");
assert(globalThis.SnakeBonDTodayProgram.readBudget() === 90, "Le budget du programme n’a pas été restauré");
assert(globalThis.SnakeBonDTodayProgram.read()[0].id === "programme-1", "Le programme du jour n’a pas été restauré");

const legacy = { ...source, version: 1, data: { ...source.data } };
delete legacy.data.todayProgram;
const legacyParsed = globalThis.SnakeBonDBackup.parse(JSON.stringify(legacy), { allowedCategories });
assert(legacyParsed.data.todayProgram.items.length === 0 && legacyParsed.data.todayProgram.budget === 120, "Une ancienne sauvegarde n’a pas été migrée");

for (const invalid of ["pas du json", JSON.stringify({ schema: "autre", version: 1, data: {} })]) {
  let rejected = false;
  try {
    globalThis.SnakeBonDBackup.parse(invalid, { allowedCategories });
  } catch {
    rejected = true;
  }
  assert(rejected, "Une sauvegarde incompatible a été acceptée");
}

const previousFavorites = globalThis.SnakeBonDFavorites.entries();
const previousProgram = globalThis.SnakeBonDTodayProgram.read();
blockedKey = globalThis.SnakeBonDPreferences.storageKey;
const failed = globalThis.SnakeBonDBackup.apply({
  ...parsed,
  data: { ...parsed.data, favorites: ["Jeux::itch.io"] },
}, { allowedCategories });
blockedKey = null;
assert(!failed, "Une restauration partielle aurait dû échouer");
assert(globalThis.SnakeBonDFavorites.entries()[0] === previousFavorites[0], "Le retour arrière des favoris a échoué");
assert(globalThis.SnakeBonDTodayProgram.read()[0].id === previousProgram[0].id, "Le retour arrière du programme a échoué");

console.log("Tests v4.6 réussis : export, migration, programme du jour, validation et retour arrière conformes.");
