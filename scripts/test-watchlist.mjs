const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
};
globalThis.window = globalThis;
globalThis.dispatchEvent = () => true;
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};

await import("../js/watchlist.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const item = {
  id: "arte-test",
  title: "Programme test",
  platform: "ARTE",
  addedDate: "2026-09-09",
  verified: true,
};

assert(globalThis.SnakeBonDWatchlist.set(item, "discover"), "Le statut n’est pas enregistré");
assert(globalThis.SnakeBonDWatchlist.get(item.id).status === "discover", "Le statut enregistré est invalide");
assert(!globalThis.SnakeBonDWatchlist.set(item, "invalid"), "Un statut invalide a été accepté");
assert(globalThis.SnakeBonDWatchlist.list([item]).at(0).item.title === item.title, "Le contenu n’est pas relié à la liste");

const newItems = globalThis.SnakeBonDWatchlist.newSince(
  [item, { ...item, id: "old", addedDate: "2026-08-01" }],
  "2026-09-08T00:00:00Z",
  new Date("2026-09-10T00:00:00Z"),
);
assert(newItems.length === 1 && newItems[0].id === item.id, "La détection des nouveautés est incorrecte");

assert(globalThis.SnakeBonDWatchlist.recordVisit(new Date("2026-09-10T00:00:00Z")), "La visite n’est pas enregistrée");
assert(globalThis.SnakeBonDWatchlist.readLastVisit() === "2026-09-10T00:00:00.000Z", "La date de visite est invalide");
assert(globalThis.SnakeBonDWatchlist.remove(item.id), "Le retrait échoue");
assert(globalThis.SnakeBonDWatchlist.get(item.id) === null, "Le contenu retiré est encore présent");

console.log("Liste personnelle v1.4 validée : statuts, nouveautés et stockage local conformes.");
