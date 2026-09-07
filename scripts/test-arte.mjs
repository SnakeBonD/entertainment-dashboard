import {
  arteLandingPage,
  extractArteSelection,
  findArteSelectionEndpoint,
  syncArteCatalogue,
} from "./arte.mjs";

const now = new Date("2026-09-07T12:00:00Z");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function item(overrides = {}) {
  return {
    programId: "117646-000-A",
    title: "Bon voyage",
    kind: { code: "SHOW", isCollection: false, label: "Programme" },
    mainImage: { url: "https://api-cdn.arte.tv/img/v2/image/test/__SIZE__?type=TEXT" },
    shortDescription: "Une sélection de test.",
    teaserText: "Un film sélectionné par ARTE.",
    stickers: [{ code: "FULL_VIDEO" }, { code: "PLAYABLE" }],
    availability: {
      start: "2026-09-02T09:45:00Z",
      end: "2027-03-02T10:45:00Z",
      hasVideoStreams: true,
    },
    geoblocking: { code: "DE_FR", inclusion: [], exclusion: [] },
    genre: { label: "Cinéma", itemLabel: "Film" },
    durationLabel: "109 min",
    url: "https://www.arte.tv/fr/videos/117646-000-A/bon-voyage/",
    ...overrides,
  };
}

const pagePayload = {
  value: {
    zones: [{
      code: "plus_vues",
      content: { esiInclude: "/api/emac/v4/fr/web/zones/test/content?page=1" },
    }],
  },
};
assert(
  findArteSelectionEndpoint(pagePayload)
    === "https://api.arte.tv/api/emac/v4/fr/web/zones/test/content?page=1&authorizedCountry=FR",
  "La sélection officielle ARTE n’a pas été trouvée",
);

let unofficialEndpointRejected = false;
try {
  findArteSelectionEndpoint({
    zones: [{ code: "plus_vues", content: { esiInclude: "https://example.com/feed" } }],
  });
} catch {
  unofficialEndpointRejected = true;
}
assert(unofficialEndpointRejected, "Une URL de sélection ARTE non officielle a été acceptée");

const futureItem = item({
  programId: "future",
  availability: {
    start: "2026-09-08T09:45:00Z",
    end: "2027-03-02T10:45:00Z",
    hasVideoStreams: true,
  },
});
const collection = item({ programId: "collection", kind: { code: "TV_SERIES", isCollection: true } });
const unavailable = item({
  programId: "unavailable",
  availability: {
    start: "2026-09-02T09:45:00Z",
    end: "2027-03-02T10:45:00Z",
    hasVideoStreams: false,
  },
});
const outsideFrance = item({
  programId: "outside-france",
  geoblocking: { code: "DE", inclusion: ["DE"], exclusion: [] },
});
const excludedFrance = item({
  programId: "excluded-france",
  geoblocking: { code: "EUROPE", inclusion: [], exclusion: ["FR"] },
});
const nonOfficialUrl = item({ programId: "bad-url", url: "https://example.com/video" });
const missingImage = item({ programId: "missing-image", mainImage: null });

const selection = extractArteSelection({
  data: [item(), futureItem, collection, unavailable, outsideFrance, excludedFrance, nonOfficialUrl, missingImage],
}, now);

assert(selection.length === 1, "Seul le programme ARTE actif en France doit être importé");
assert(selection[0].title === "Bon voyage", "Le titre ARTE est incorrect");
assert(selection[0].type === "movie", "Le type du programme ARTE est incorrect");
assert(selection[0].sourceUrl === arteLandingPage, "La source officielle ARTE est absente");
assert(selection[0].imageUrl.includes("768x432"), "L’image ARTE n’a pas été normalisée");
assert(selection[0].durationLabel === "109 min", "La durée ARTE est absente");

const initialCatalogue = {
  version: 4,
  lastUpdated: null,
  items: [{ id: "manual-entry", provider: "manual", verified: true }],
};
const firstSync = syncArteCatalogue(initialCatalogue, selection, now);
assert(firstSync.changed === true, "Le premier import ARTE doit modifier le catalogue");
assert(firstSync.activeCount === 1, "Le nombre de programmes ARTE actifs est incorrect");
assert(firstSync.catalogue.items.some((entry) => entry.id === "manual-entry"), "Une entrée non ARTE a été supprimée");

const later = new Date("2026-09-07T14:00:00Z");
const stableSelection = extractArteSelection({ data: [item()] }, later);
const stableSync = syncArteCatalogue(firstSync.catalogue, stableSelection, later);
assert(stableSync.changed === false, "Une sélection ARTE identique ne doit pas réécrire le catalogue");

const missingSync = syncArteCatalogue(firstSync.catalogue, [], later);
const hidden = missingSync.catalogue.items.find((entry) => entry.id === selection[0].id);
assert(hidden?.verified === false, "Un programme absent de la sélection doit être masqué");
assert(hidden?.verificationNote === "not_in_current_selection", "La raison du masquage ARTE est absente");

const mixedCatalogue = {
  ...firstSync.catalogue,
  items: [{ id: "epic-test", provider: "epic-games-store", verified: true }, selection[0]],
};
const orderedArteSync = syncArteCatalogue(mixedCatalogue, stableSelection, later);
assert(orderedArteSync.catalogue.items[0].provider === "arte", "L’ordre commun du catalogue n’est pas stable après ARTE");

let malformedRejected = false;
try {
  extractArteSelection({}, now);
} catch {
  malformedRejected = true;
}
assert(malformedRejected, "Une réponse ARTE invalide a été acceptée");

console.log("Tests v0.6 réussis : sélection ARTE, géoblocage et synchronisation conformes.");
