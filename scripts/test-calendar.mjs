await import("../js/calendar.js");

const calendar = globalThis.SnakeBonDCalendar;
const now = new Date("2026-09-11T10:00:00Z");
const items = [
  {
    id: "arte-film-1",
    title: "Un film, une histoire ; très longue avec des caractères accentués pour vérifier le pliage",
    platform: "ARTE",
    provider: "arte",
    url: "https://www.arte.tv/fr/videos/test/",
    expiryDate: "2026-09-15T20:30:00Z",
  },
  {
    id: "epic-game-1",
    title: "Jeu gratuit",
    platform: "Epic Games Store",
    provider: "epic-games-store",
    url: "https://store.epicgames.com/fr/p/test",
    expiryDate: "2026-09-12T15:00:00Z",
  },
  {
    id: "expired",
    title: "Déjà expiré",
    platform: "ARTE",
    url: "https://example.com/expired",
    expiryDate: "2026-09-10T10:00:00Z",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ics = calendar.build([...items, items[0]], { name: "Agenda, personnel", now });
assert(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0"), "L’en-tête ICS est invalide");
assert(ics.endsWith("END:VCALENDAR\r\n"), "La fin du calendrier ICS est invalide");
assert((ics.match(/BEGIN:VEVENT/g) ?? []).length === 2, "Les doublons ou échéances expirées ne sont pas filtrés");
assert(ics.indexOf("epic-game-1") < ics.indexOf("arte-film-1"), "Les événements ne sont pas triés par échéance");
assert(ics.includes("DTSTART:20260912T150000Z"), "La date UTC n’est pas correctement formatée");
assert(ics.includes("Récupérer sur Epic Games Store"), "L’action Epic Games est incorrecte");
assert(ics.includes("Agenda\\, personnel"), "Les virgules du texte ICS ne sont pas échappées");
assert(ics.includes("une histoire \\; très longue"), "Les points-virgules du texte ICS ne sont pas échappés");
assert(!ics.includes("Déjà expiré"), "Un contenu expiré apparaît dans le calendrier");

ics.split("\r\n").forEach((line) => {
  assert(new TextEncoder().encode(line).length <= 75, "Une ligne ICS dépasse 75 octets");
});

console.log("Tests v1.8 réussis : calendrier ICS, dates UTC, tri, dédoublonnage, échappement et pliage conformes.");
