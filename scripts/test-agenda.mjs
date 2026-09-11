await import("../js/availability.js");

const agenda = globalThis.SnakeBonDAvailability;
const now = new Date("2026-09-11T10:00:00Z");
const items = [
  { id: "today", title: "Aujourd’hui", expiryDate: "2026-09-11T20:00:00Z" },
  { id: "tomorrow", title: "Demain", expiryDate: "2026-09-12T20:00:00Z" },
  { id: "week", title: "Cette semaine", expiryDate: "2026-09-17T20:00:00Z" },
  { id: "later", title: "Plus tard", expiryDate: "2026-10-20T20:00:00Z" },
  { id: "permanent", title: "Permanent", expiryDate: null },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fortnight = agenda.buildAgenda(items, { days: 14 }, now);
assert(fortnight.length === 3, "L’agenda sur 14 jours doit contenir trois dates");
assert(fortnight[0].label === "Aujourd’hui", "La première échéance doit être aujourd’hui");
assert(fortnight[1].label === "Demain", "La deuxième échéance doit être demain");
assert(fortnight.flatMap((group) => group.items).length === 3, "La fenêtre de 14 jours est incorrecte");

const tracked = agenda.buildAgenda(items, {
  days: Number.POSITIVE_INFINITY,
  trackedOnly: true,
  isTracked: (item) => item.id === "tomorrow" || item.id === "later",
}, now);
assert(tracked.flatMap((group) => group.items).length === 2, "Le filtre des contenus suivis est incorrect");
assert(!tracked.flatMap((group) => group.items).some((item) => item.id === "permanent"), "Un contenu sans échéance apparaît dans l’agenda");

console.log("Agenda v1.5 validé : périodes, regroupements et contenus suivis conformes.");
