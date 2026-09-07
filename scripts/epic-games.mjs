const epicProvider = "epic-games-store";

export const epicGamesEndpoint =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=fr-FR&country=FR&allowCountries=FR";
export const epicGamesLandingPage = "https://store.epicgames.com/fr/free-games";

function asTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeText(value, maxLength = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function promotionEntries(offer, key) {
  return (offer?.promotions?.[key] ?? []).flatMap((group) => group?.promotionalOffers ?? []);
}

export function findActiveFreePromotion(offer, now = new Date()) {
  const nowTimestamp = now.getTime();
  if (Number.isNaN(nowTimestamp)) return null;

  return promotionEntries(offer, "promotionalOffers")
    .filter((promotion) => {
      const start = asTimestamp(promotion?.startDate);
      const end = asTimestamp(promotion?.endDate);
      return promotion?.discountSetting?.discountPercentage === 0
        && start !== null
        && end !== null
        && start <= nowTimestamp
        && end > nowTimestamp;
    })
    .sort((a, b) => asTimestamp(a.endDate) - asTimestamp(b.endDate))[0] ?? null;
}

function isGameOffer(offer) {
  const categoryPaths = (offer?.categories ?? []).map((category) => category?.path);
  return categoryPaths.includes("games")
    && offer?.offerType !== "ADD_ON"
    && offer?.isCodeRedemptionOnly !== true;
}

function pageSlug(offer) {
  const mappings = [
    ...(offer?.offerMappings ?? []),
    ...(offer?.catalogNs?.mappings ?? []),
  ];
  const mapped = mappings.find((mapping) =>
    mapping?.pageType === "productHome" && typeof mapping?.pageSlug === "string",
  );
  if (mapped) return mapped.pageSlug;

  const productSlug = String(offer?.productSlug ?? "").replace(/\/home$/, "");
  return productSlug || null;
}

function imageUrl(offer) {
  const images = offer?.keyImages ?? [];
  const preferredTypes = ["OfferImageWide", "featuredMedia", "OfferImageTall", "Thumbnail"];
  for (const type of preferredTypes) {
    const image = images.find((candidate) => candidate?.type === type && candidate?.url);
    if (image) return image.url;
  }
  return null;
}

function isTemporaryFreeGame(offer, now) {
  const price = offer?.price?.totalPrice;
  return offer?.status === "ACTIVE"
    && isGameOffer(offer)
    && price?.discountPrice === 0
    && Number(price?.originalPrice) > 0
    && Boolean(findActiveFreePromotion(offer, now));
}

export function extractEpicGames(payload, now = new Date()) {
  const offers = payload?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(offers)) {
    throw new Error("La réponse Epic Games ne contient pas le catalogue attendu.");
  }

  return offers
    .filter((offer) => isTemporaryFreeGame(offer, now))
    .map((offer) => {
      const promotion = findActiveFreePromotion(offer, now);
      const slug = pageSlug(offer);
      const startDate = promotion.startDate;
      const endDate = promotion.endDate;
      const title = normalizeText(offer.title, 120);
      const usualPrice = normalizeText(offer?.price?.totalPrice?.fmtPrice?.originalPrice, 40);

      return {
        id: `epic-${offer.id}-${startDate.slice(0, 10)}`,
        title,
        type: "game",
        platform: "Epic Games Store",
        url: slug
          ? `https://store.epicgames.com/fr/p/${encodeURIComponent(slug)}`
          : epicGamesLandingPage,
        country: "FR",
        addedDate: startDate.slice(0, 10),
        promotionStartDate: startDate,
        expiryDate: endDate,
        verified: true,
        verifiedAt: now.toISOString(),
        sourceUrl: epicGamesLandingPage,
        provider: epicProvider,
        externalId: offer.id,
        description: "À récupérer gratuitement sur l’Epic Games Store avant la fin de l’offre.",
        imageUrl: imageUrl(offer),
        originalPrice: usualPrice || null,
      };
    })
    .sort((a, b) => Date.parse(a.expiryDate) - Date.parse(b.expiryDate)
      || a.title.localeCompare(b.title, "fr"));
}

function comparableItem(item) {
  const { verifiedAt: _verifiedAt, ...rest } = item;
  return rest;
}

function sameOffer(previous, current) {
  return JSON.stringify(comparableItem(previous)) === JSON.stringify(comparableItem(current));
}

function catalogueOrder(a, b) {
  return String(a?.provider ?? "").localeCompare(String(b?.provider ?? ""), "fr")
    || String(a?.id ?? "").localeCompare(String(b?.id ?? ""), "fr");
}

export function syncEpicCatalogue(catalogue, epicGames, now = new Date()) {
  const nowIso = now.toISOString();
  const existingItems = Array.isArray(catalogue?.items) ? catalogue.items : [];
  const nonEpicItems = existingItems.filter((item) => item.provider !== epicProvider);
  const previousEpicItems = existingItems.filter((item) => item.provider === epicProvider);
  const previousById = new Map(previousEpicItems.map((item) => [item.id, item]));
  const currentIds = new Set(epicGames.map((item) => item.id));

  const currentEpicItems = epicGames.map((item) => {
    const previous = previousById.get(item.id);
    return previous && previous.verified === true && sameOffer(previous, item)
      ? previous
      : item;
  });

  const missingEpicItems = previousEpicItems
    .filter((item) => !currentIds.has(item.id))
    .map((item) => {
      if (item.verified === false && item.verificationNote === "not_in_current_feed") return item;
      return {
        ...item,
        verified: false,
        verificationNote: "not_in_current_feed",
        lastCheckedAt: nowIso,
      };
    });

  const items = [...nonEpicItems, ...currentEpicItems, ...missingEpicItems].sort(catalogueOrder);
  const changed = JSON.stringify(items) !== JSON.stringify(existingItems);

  return {
    changed,
    activeCount: currentEpicItems.length,
    hiddenCount: missingEpicItems.filter((item) => item.verified === false).length,
    catalogue: {
      version: catalogue?.version ?? 4,
      lastUpdated: changed ? nowIso : catalogue?.lastUpdated ?? null,
      items,
    },
  };
}

export const epicGamesProvider = epicProvider;
