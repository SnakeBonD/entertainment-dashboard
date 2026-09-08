const radioFranceProvider = "radio-france";

export const radioFranceFeeds = [
  {
    id: "les-pieds-sur-terre",
    title: "Les pieds sur terre",
    station: "France Culture",
    feedUrl: "https://radiofrance-podcast.net/podcast09/podcast_14303c46-3c2f-486f-a063-fadf9719bff3.xml",
    landingUrl: "https://www.radiofrance.fr/franceculture/podcasts/les-pieds-sur-terre",
  },
  {
    id: "affaires-sensibles",
    title: "Affaires sensibles",
    station: "France Inter",
    feedUrl: "https://radiofrance-podcast.net/podcast09/podcast_0b91efaf-26e6-11e4-907f-782bcb6744eb.xml",
    landingUrl: "https://www.radiofrance.fr/franceinter/podcasts/affaires-sensibles",
  },
];

function decodeXml(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return String(value ?? "")
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => namedEntities[name.toLowerCase()] ?? entity);
}

function normalizeText(value, maxLength = 280) {
  const text = decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(
    `<${escapeExpression(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeExpression(tag)}>` ,
    "i",
  ));
  return match ? decodeXml(match[1]).trim() : "";
}

function tagAttribute(block, tag, attribute) {
  const match = block.match(new RegExp(
    `<${escapeExpression(tag)}\\b[^>]*\\b${escapeExpression(attribute)}=(?:"([^"]*)"|'([^']*)')[^>]*\\/?>`,
    "i",
  ));
  return match ? decodeXml(match[1] ?? match[2]).trim() : "";
}

function officialUrl(value, hostname, pathPrefix = "/") {
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

function episodeDescription(value, podcastTitle) {
  let description = normalizeText(value, 900);
  const durationPrefix = /^durée\s*:\s*\d{1,2}:\d{2}(?::\d{2})?\s*-\s*/i;
  description = description.replace(durationPrefix, "");
  description = description.replace(new RegExp(`^${escapeExpression(podcastTitle)}\\s*-\\s*`, "i"), "");
  description = description.replace(/^par\s*:\s*[^-]+\s*-\s*/i, "");
  description = description.split(/\s+-\s+équipe\s*:/i)[0];
  description = description.split(/Vous aimez ce podcast\s*\?/i)[0];
  return normalizeText(description, 280);
}

function formatDuration(value) {
  const parts = String(value ?? "").trim().split(":").map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return null;
  const seconds = parts.length === 3
    ? (parts[0] * 3600) + (parts[1] * 60) + parts[2]
    : (parts[0] * 60) + parts[1];
  if (seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${String(remaining).padStart(2, "0")}` : `${hours} h`;
}

function isRecentPublication(value, now, maximumAgeDays) {
  const publishedAt = Date.parse(value);
  if (Number.isNaN(publishedAt)) return false;
  const age = now.getTime() - publishedAt;
  return age >= -(15 * 60 * 1000) && age <= maximumAgeDays * 24 * 60 * 60 * 1000;
}

function cleanGuid(value) {
  const guid = normalizeText(value, 80).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(guid)
    ? guid
    : null;
}

export function extractRadioFranceFeed(xml, feed, now = new Date(), limit = 3) {
  if (!feed || !radioFranceFeeds.some((candidate) => candidate.id === feed.id)) {
    throw new Error("Le flux Radio France demandé n’est pas autorisé.");
  }
  if (typeof xml !== "string" || !xml.includes("<rss") || !xml.includes("<channel>")) {
    throw new Error(`Le flux ${feed.title} n’est pas un document RSS valide.`);
  }
  if (Number.isNaN(now.getTime())) throw new Error("La date de contrôle Radio France est invalide.");

  const channel = tagValue(xml, "channel");
  const generator = normalizeText(tagValue(channel, "generator"), 80);
  const copyright = normalizeText(tagValue(channel, "copyright"), 80);
  const station = normalizeText(tagValue(channel, "itunes:author"), 80);
  const channelTitle = normalizeText(tagValue(channel, "title"), 120);
  if (generator !== "Radio France" || copyright !== "Radio France") {
    throw new Error(`Le flux ${feed.title} n’est pas identifié comme une source Radio France.`);
  }
  if (station !== feed.station || channelTitle !== feed.title) {
    throw new Error(`L’identité du flux ${feed.title} ne correspond pas à la sélection attendue.`);
  }

  const channelImage = officialUrl(
    tagAttribute(channel, "itunes:image", "href") || tagValue(tagValue(channel, "image"), "url"),
    "www.radiofrance.fr",
    "/s3/",
  );
  if (!channelImage) throw new Error(`Le visuel officiel du flux ${feed.title} est absent.`);

  const itemBlocks = [...channel.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  const seen = new Set();
  return itemBlocks
    .map((item) => {
      const guid = cleanGuid(tagValue(item, "guid"));
      const publishedAt = tagValue(item, "pubDate");
      const audioUrl = officialUrl(tagAttribute(item, "enclosure", "url"), "proxycast.radiofrance.fr");
      const episodeImage = officialUrl(
        tagAttribute(item, "itunes:image", "href"),
        "www.radiofrance.fr",
        "/s3/",
      ) || channelImage;
      const episodeLink = officialUrl(tagValue(item, "link"), "www.radiofrance.fr");
      const durationLabel = formatDuration(tagValue(item, "itunes:duration"));
      const title = normalizeText(tagValue(item, "title"), 140);
      const explicit = normalizeText(tagValue(item, "itunes:explicit"), 20).toLowerCase();
      const description = episodeDescription(tagValue(item, "description"), feed.title);

      if (
        !guid
        || seen.has(guid)
        || !title
        || !description
        || !audioUrl
        || !episodeImage
        || !durationLabel
        || explicit !== "no"
        || !isRecentPublication(publishedAt, now, 14)
      ) return null;
      seen.add(guid);

      const publishedDate = new Date(publishedAt);
      const specificEpisodeUrl = episodeLink && new URL(episodeLink).pathname !== "/"
        ? episodeLink
        : feed.landingUrl;
      return {
        id: `radio-france-${guid}`,
        title,
        podcastTitle: feed.title,
        station: feed.station,
        url: specificEpisodeUrl,
        audioUrl,
        imageUrl: episodeImage,
        publishedAt: publishedDate.toISOString(),
        durationLabel,
        description,
        provider: radioFranceProvider,
        verifiedAt: now.toISOString(),
        sourceUrl: feed.feedUrl,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function comparableItem(item) {
  const { verifiedAt: _verifiedAt, ...rest } = item;
  return rest;
}

function sameEpisode(previous, current) {
  return JSON.stringify(comparableItem(previous)) === JSON.stringify(comparableItem(current));
}

function radioFranceOrder(a, b) {
  return String(a.station).localeCompare(String(b.station), "fr")
    || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    || String(a.id).localeCompare(String(b.id), "fr");
}

export function syncRadioFranceSelection(selection, episodes, now = new Date()) {
  const existingItems = Array.isArray(selection?.items) ? selection.items : [];
  const previousById = new Map(existingItems.map((item) => [item.id, item]));
  const items = episodes
    .map((episode) => {
      const previous = previousById.get(episode.id);
      return previous && sameEpisode(previous, episode) ? previous : episode;
    })
    .sort(radioFranceOrder);
  const changed = JSON.stringify(items) !== JSON.stringify(existingItems);

  return {
    changed,
    count: items.length,
    selection: {
      version: 1,
      lastUpdated: changed ? now.toISOString() : selection?.lastUpdated ?? null,
      items,
    },
  };
}

export const radioFranceSelectionProvider = radioFranceProvider;
