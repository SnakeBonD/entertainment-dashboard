import {
  epicGamesLandingPage,
  extractEpicGames,
  findActiveFreePromotion,
  syncEpicCatalogue,
} from "./epic-games.mjs";

const now = new Date("2026-09-07T12:00:00Z");

function promotion(startDate, endDate, discountPercentage = 0) {
  return {
    promotionalOffers: [{
      startDate,
      endDate,
      discountSetting: { discountType: "PERCENTAGE", discountPercentage },
    }],
  };
}

function offer(overrides = {}) {
  return {
    title: "Jeu de test",
    id: "offer-1",
    description: "Une aventure de test.",
    offerType: "BASE_GAME",
    status: "ACTIVE",
    isCodeRedemptionOnly: false,
    categories: [{ path: "games" }],
    offerMappings: [{ pageSlug: "jeu-de-test", pageType: "productHome" }],
    keyImages: [{ type: "OfferImageWide", url: "https://cdn1.epicgames.com/test.jpg" }],
    price: {
      totalPrice: {
        discountPrice: 0,
        originalPrice: 1999,
        fmtPrice: { originalPrice: "19,99 €" },
      },
    },
    promotions: {
      promotionalOffers: [promotion("2026-09-03T15:00:00Z", "2026-09-10T15:00:00Z")],
      upcomingPromotionalOffers: [],
    },
    ...overrides,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const activeOffer = offer();
const futureOffer = offer({
  id: "future",
  promotions: {
    promotionalOffers: [],
    upcomingPromotionalOffers: [promotion("2026-09-10T15:00:00Z", "2026-09-17T15:00:00Z")],
  },
});
const discountedOffer = offer({
  id: "discounted",
  price: { totalPrice: { discountPrice: 999, originalPrice: 1999 } },
  promotions: {
    promotionalOffers: [promotion("2026-09-03T15:00:00Z", "2026-09-10T15:00:00Z", 50)],
  },
});
const permanentFreeOffer = offer({
  id: "permanent-free",
  price: { totalPrice: { discountPrice: 0, originalPrice: 0 } },
});
const addOnOffer = offer({ id: "add-on", offerType: "ADD_ON" });
const payload = {
  data: {
    Catalog: {
      searchStore: {
        elements: [activeOffer, futureOffer, discountedOffer, permanentFreeOffer, addOnOffer],
      },
    },
  },
};

assert(findActiveFreePromotion(activeOffer, now)?.endDate === "2026-09-10T15:00:00Z", "La promotion active est introuvable");
assert(findActiveFreePromotion(futureOffer, now) === null, "Une promotion future a été traitée comme active");

const games = extractEpicGames(payload, now);
assert(games.length === 1, "Seul le jeu temporairement gratuit doit être importé");
assert(games[0].title === "Jeu de test", "Le titre Epic Games est incorrect");
assert(games[0].expiryDate === "2026-09-10T15:00:00Z", "La date de fin est incorrecte");
assert(games[0].url === "https://store.epicgames.com/fr/p/jeu-de-test", "L’URL du jeu est incorrecte");
assert(games[0].sourceUrl === epicGamesLandingPage, "La source officielle est absente");
assert(games[0].originalPrice === "19,99 €", "Le prix habituel est incorrect");

const initialCatalogue = {
  version: 4,
  lastUpdated: null,
  items: [{
    id: "manual-entry",
    title: "Entrée manuelle",
    provider: "manual",
    verified: true,
  }],
};
const firstSync = syncEpicCatalogue(initialCatalogue, games, now);
assert(firstSync.changed === true, "Le premier import doit modifier le catalogue");
assert(firstSync.activeCount === 1, "Le nombre de jeux actifs est incorrect");
assert(firstSync.catalogue.items.some((item) => item.id === "manual-entry"), "Une entrée non Epic a été supprimée");

const later = new Date("2026-09-07T14:00:00Z");
const secondGames = extractEpicGames(payload, later);
const stableSync = syncEpicCatalogue(firstSync.catalogue, secondGames, later);
assert(stableSync.changed === false, "Un flux Epic identique ne doit pas réécrire le catalogue");

const missingSync = syncEpicCatalogue(firstSync.catalogue, [], later);
const hidden = missingSync.catalogue.items.find((item) => item.id === games[0].id);
assert(hidden?.verified === false, "Une offre absente du flux doit être masquée");
assert(hidden?.verificationNote === "not_in_current_feed", "La raison du masquage est absente");

const mixedCatalogue = {
  ...firstSync.catalogue,
  items: [firstSync.catalogue.items.find((item) => item.provider === "epic-games-store"), {
    id: "arte-test",
    provider: "arte",
    verified: true,
  }],
};
const orderedEpicSync = syncEpicCatalogue(mixedCatalogue, secondGames, later);
assert(orderedEpicSync.catalogue.items[0].provider === "arte", "L’ordre commun du catalogue n’est pas stable après Epic Games");

let malformedRejected = false;
try {
  extractEpicGames({}, now);
} catch {
  malformedRejected = true;
}
assert(malformedRejected, "Une réponse Epic Games invalide a été acceptée");

console.log("Tests v0.5 réussis : import Epic Games, exclusions et synchronisation conformes.");
