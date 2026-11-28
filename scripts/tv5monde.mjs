const tv5MondeProvider = "tv5mondeplus";

export const tv5MondeSitemapUrl = "https://www.tv5mondeplus.com/film-et-serie-sitemap.xml";
export const tv5MondeLandingPage = "https://www.tv5mondeplus.com/fr";
export const tv5MondeContentTypes = ["films", "series", "documentaires"];

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeText(value, maxLength = 280) {
  const text = String(value ?? "")
    .replace(/\\u0020/g, " ")
    .replace(/\\u00([0-9a-f]{2})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\r|\\n/g, " ")
    .replace(/\\u002D/g, "-")
    .replace(/\\u0027/g, "'")
    .replace(/\\u00([0-9A-F]{2})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function parseDate(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function officialUrl(value, pathPrefix = "/fr/") {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "www.tv5mondeplus.com"
      && url.pathname.startsWith(pathPrefix)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function jsonLdBlocks(html) {
  return [...String(html ?? "").matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )]
    .map((match) => {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    })
    .filter((value) => value && typeof value === "object");
}

function findStructuredContent(blocks) {
  const values = blocks.flatMap((block) => Array.isArray(block) ? block : [block]);
  const primary = values.find((value) => ["Movie", "TVSeries", "TVEpisode", "VideoObject"].includes(value?.["@type"]));
  return primary ?? null;
}

function categoryFromUrl(url) {
  const match = new URL(url).pathname.match(/^\/fr\/(films|series|documentaires)\//);
  return match?.[1] ?? null;
}

function durationLabel(value) {
  const match = String(value ?? "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const minutes = (Number(match[1] ?? 0) * 60) + Number(match[2] ?? 0) + Math.round(Number(match[3] ?? 0) / 60);
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${String(remaining).padStart(2, "0")}` : `${hours} h`;
}

function slugFromUrl(url) {
  const path = new URL(url).pathname.replace(/^\/fr\//, "").replace(/\/$/, "");
  return path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function parseTv5MondeSitemap(xml, limitPerType = 4) {
  if (typeof xml !== "string" || !xml.includes("<urlset")) {
    throw new Error("Le sitemap TV5MONDE+ n’est pas un document XML valide.");
  }

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)]
    .map((match) => {
      const loc = match[1].match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i)?.[1];
      const lastmod = match[1].match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i)?.[1];
      const url = officialUrl(decodeXml(loc));
      const category = url ? categoryFromUrl(url) : null;
      return url && category && parseDate(lastmod)
        ? { url, category, lastmod: parseDate(lastmod) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod) || a.url.localeCompare(b.url));

  const selected = [];
  for (const category of tv5MondeContentTypes) {
    selected.push(...entries.filter((entry) => entry.category === category).slice(0, limitPerType));
  }
  return selected;
}

export function extractTv5MondePage(html, page, now = new Date()) {
  if (!page || !officialUrl(page.url)) throw new Error("La page TV5MONDE+ demandée n’est pas officielle.");
  if (Number.isNaN(now.getTime())) throw new Error("La date de contrôle TV5MONDE+ est invalide.");

  const content = findStructuredContent(jsonLdBlocks(html));
  const title = normalizeText(content?.name, 140);
  const description = normalizeText(content?.description, 280);
  const imageUrl = Array.isArray(content?.image)
    ? content.image[0]
    : content?.image ?? content?.thumbnailUrl?.[0];
  const image = imageUrl && /^https:\/\/assets\.tv5mondeplus\.com\//.test(imageUrl) ? imageUrl : null;
  const url = officialUrl(content?.url) ?? page.url;
  const type = page.category === "films" ? "movie" : page.category === "documentaires" ? "documentary" : "tv";

  if (!title || !description || !image || !url) return null;

  const publishedAt = parseDate(content?.uploadDate) ?? parseDate(content?.datePublished) ?? page.lastmod;
  return {
    id: `tv5mondeplus-${slugFromUrl(page.url)}`,
    title,
    type,
    platform: "TV5MONDE+",
    url,
    country: "FR",
    addedDate: publishedAt.slice(0, 10),
    expiryDate: null,
    verified: true,
    verifiedAt: now.toISOString(),
    sourceUrl: tv5MondeSitemapUrl,
    provider: tv5MondeProvider,
    externalId: slugFromUrl(page.url),
    description,
    imageUrl: image,
    durationLabel: durationLabel(content?.duration),
    selectionLabel: "Sélection officielle TV5MONDE+",
  };
}

function comparableItem(item) {
  const { verifiedAt: _verifiedAt, ...rest } = item;
  return rest;
}

function sameItem(previous, current) {
  return JSON.stringify(comparableItem(previous)) === JSON.stringify(comparableItem(current));
}

function catalogueOrder(a, b) {
  return String(a?.provider ?? "").localeCompare(String(b?.provider ?? ""), "fr")
    || String(a?.id ?? "").localeCompare(String(b?.id ?? ""), "fr");
}

export function syncTv5MondeCatalogue(catalogue, entries, now = new Date()) {
  const nowIso = now.toISOString();
  const existingItems = Array.isArray(catalogue?.items) ? catalogue.items : [];
  const nonTv5Items = existingItems.filter((item) => item.provider !== tv5MondeProvider);
  const previousItems = existingItems.filter((item) => item.provider === tv5MondeProvider);
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const currentIds = new Set(entries.map((item) => item.id));
  const currentItems = entries.map((item) => {
    const previous = previousById.get(item.id);
    return previous && previous.verified === true && sameItem(previous, item) ? previous : item;
  });
  const missingItems = previousItems
    .filter((item) => !currentIds.has(item.id))
    .map((item) => item.verified === false && item.verificationNote === "not_in_current_selection"
      ? item
      : { ...item, verified: false, verificationNote: "not_in_current_selection", lastCheckedAt: nowIso });
  const items = [...nonTv5Items, ...currentItems, ...missingItems].sort(catalogueOrder);
  const changed = JSON.stringify(items) !== JSON.stringify(existingItems);
  return {
    changed,
    activeCount: currentItems.length,
    hiddenCount: missingItems.length,
    catalogue: {
      version: catalogue?.version ?? 4,
      lastUpdated: changed ? nowIso : catalogue?.lastUpdated ?? null,
      items,
    },
  };
}

export { tv5MondeProvider };
