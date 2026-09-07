const arteProvider = "arte";

export const arteHomeEndpoint = "https://api.arte.tv/api/emac/v4/fr/web/pages/HOME";
export const arteLandingPage = "https://www.arte.tv/fr/videos/plus-vues/";
export const artePopularZoneCode = "plus_vues";
export const arteApiOrigin = "https://api.arte.tv";

function asTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeText(value, maxLength = 280) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function officialUrl(value, hostname, pathPrefix) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === hostname
      && url.pathname.startsWith(pathPrefix)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function findZone(value, code) {
  if (!value || typeof value !== "object") return null;
  if (
    value.code === code
    && value.content
    && typeof value.content === "object"
  ) {
    return value;
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const match = findZone(child, code);
    if (match) return match;
  }
  return null;
}

export function findArteSelectionEndpoint(payload, code = artePopularZoneCode) {
  const zone = findZone(payload, code);
  if (!zone) {
    throw new Error(`La sélection ARTE « ${code} » est absente de la page officielle.`);
  }

  const endpointValue = zone.content.esiInclude ?? zone.content.pagination?.links?.first;
  if (typeof endpointValue !== "string") {
    throw new Error("La sélection ARTE ne fournit pas d’URL de contenu officielle.");
  }

  const endpoint = new URL(endpointValue, arteApiOrigin);
  if (
    endpoint.protocol !== "https:"
    || endpoint.hostname !== "api.arte.tv"
    || !endpoint.pathname.startsWith("/api/emac/v4/fr/web/zones/")
  ) {
    throw new Error("L’URL de la sélection ARTE n’est pas officielle.");
  }
  endpoint.searchParams.set("authorizedCountry", "FR");
  return endpoint.toString();
}

function availableInFrance(geoblocking) {
  if (!geoblocking || typeof geoblocking !== "object") return false;

  const inclusion = Array.isArray(geoblocking.inclusion)
    ? geoblocking.inclusion.map((country) => String(country).toUpperCase())
    : [];
  const exclusion = Array.isArray(geoblocking.exclusion)
    ? geoblocking.exclusion.map((country) => String(country).toUpperCase())
    : [];

  if (exclusion.includes("FR")) return false;
  if (inclusion.length) return inclusion.includes("FR");

  const territories = String(geoblocking.code ?? "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  return territories.length > 0;
}

function contentType(item) {
  const labels = [
    item?.kind?.code,
    item?.kind?.label,
    item?.genre?.label,
    item?.genre?.genreName,
    item?.genre?.itemLabel,
    item?.durationLabel,
  ].map((value) => normalizeText(value, 80).toLocaleLowerCase("fr")).join(" ");

  if (labels.includes("documentaire")) return "documentary";
  if (labels.includes("film") || labels.includes("cinéma") || labels.includes("cinema")) return "movie";
  if (labels.includes("série") || labels.includes("serie") || labels.includes("émission") || labels.includes("emission")) {
    return "tv";
  }
  return null;
}

function imageUrl(item) {
  const template = officialUrl(
    item?.mainImage?.url,
    "api-cdn.arte.tv",
    "/img/",
  );
  return template ? template.replace("__SIZE__", "768x432") : null;
}

function isPlayableSelection(item, now) {
  const start = asTimestamp(item?.availability?.start);
  const end = asTimestamp(item?.availability?.end);
  const nowTimestamp = now.getTime();
  const stickers = new Set((item?.stickers ?? []).map((sticker) => sticker?.code));

  return item?.kind?.isCollection === false
    && item?.availability?.hasVideoStreams === true
    && stickers.has("FULL_VIDEO")
    && stickers.has("PLAYABLE")
    && start !== null
    && end !== null
    && start <= nowTimestamp
    && end > nowTimestamp
    && availableInFrance(item?.geoblocking)
    && Boolean(contentType(item))
    && Boolean(imageUrl(item))
    && Boolean(officialUrl(item?.url, "www.arte.tv", "/fr/videos/"));
}

export function extractArteSelection(payload, now = new Date(), limit = 12) {
  const entries = payload?.data;
  if (!Array.isArray(entries)) {
    throw new Error("La réponse ARTE ne contient pas la sélection attendue.");
  }
  if (Number.isNaN(now.getTime())) throw new Error("La date de contrôle ARTE est invalide.");

  const seen = new Set();
  return entries
    .filter((item) => isPlayableSelection(item, now))
    .filter((item) => {
      if (seen.has(item.programId)) return false;
      seen.add(item.programId);
      return true;
    })
    .slice(0, limit)
    .map((item) => {
      const startDate = item.availability.start;
      const endDate = item.availability.end;
      return {
        id: `arte-${item.programId}-${startDate.slice(0, 10)}`,
        title: normalizeText(item.title, 120),
        type: contentType(item),
        platform: "ARTE",
        url: officialUrl(item.url, "www.arte.tv", "/fr/videos/"),
        country: "FR",
        addedDate: startDate.slice(0, 10),
        availabilityStartDate: startDate,
        expiryDate: endDate,
        verified: true,
        verifiedAt: now.toISOString(),
        sourceUrl: arteLandingPage,
        provider: arteProvider,
        externalId: item.programId,
        description: normalizeText(item.teaserText || item.shortDescription, 280),
        imageUrl: imageUrl(item),
        durationLabel: normalizeText(item.durationLabel, 40) || null,
        selectionLabel: "Les vidéos les plus vues sur ARTE",
      };
    });
}

function comparableItem(item) {
  const { verifiedAt: _verifiedAt, ...rest } = item;
  return rest;
}

function sameSelection(previous, current) {
  return JSON.stringify(comparableItem(previous)) === JSON.stringify(comparableItem(current));
}

export function syncArteCatalogue(catalogue, arteItems, now = new Date()) {
  const nowIso = now.toISOString();
  const existingItems = Array.isArray(catalogue?.items) ? catalogue.items : [];
  const nonArteItems = existingItems.filter((item) => item.provider !== arteProvider);
  const previousArteItems = existingItems.filter((item) => item.provider === arteProvider);
  const previousById = new Map(previousArteItems.map((item) => [item.id, item]));
  const currentIds = new Set(arteItems.map((item) => item.id));

  const currentArteItems = arteItems.map((item) => {
    const previous = previousById.get(item.id);
    return previous && previous.verified === true && sameSelection(previous, item)
      ? previous
      : item;
  });

  const missingArteItems = previousArteItems
    .filter((item) => !currentIds.has(item.id))
    .map((item) => {
      if (item.verified === false && item.verificationNote === "not_in_current_selection") return item;
      return {
        ...item,
        verified: false,
        verificationNote: "not_in_current_selection",
        lastCheckedAt: nowIso,
      };
    });

  const items = [...nonArteItems, ...currentArteItems, ...missingArteItems];
  const changed = JSON.stringify(items) !== JSON.stringify(existingItems);

  return {
    changed,
    activeCount: currentArteItems.length,
    hiddenCount: missingArteItems.filter((item) => item.verified === false).length,
    catalogue: {
      version: catalogue?.version ?? 4,
      lastUpdated: changed ? nowIso : catalogue?.lastUpdated ?? null,
      items,
    },
  };
}

export const arteSelectionProvider = arteProvider;
