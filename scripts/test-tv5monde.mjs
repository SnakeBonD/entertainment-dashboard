import assert from "node:assert/strict";
import {
  extractTv5MondePage,
  parseTv5MondeSitemap,
  syncTv5MondeCatalogue,
} from "./tv5monde.mjs";

const now = new Date("2026-11-28T10:00:00.000Z");
const sitemap = `<?xml version="1.0"?><urlset>
  <url><loc>https://www.tv5mondeplus.com/fr/films/drame/test-film</loc><lastmod>2026-11-12</lastmod></url>
  <url><loc>https://www.tv5mondeplus.com/en/films/drame/ignore</loc><lastmod>2026-11-12</lastmod></url>
  <url><loc>https://www.tv5mondeplus.com/fr/series/drame/test-serie</loc><lastmod>2026-11-11</lastmod></url>
  <url><loc>https://www.tv5mondeplus.com/fr/documentaires/animaux/test-documentaire</loc><lastmod>2026-11-10</lastmod></url>
</urlset>`;

const pages = parseTv5MondeSitemap(sitemap, 1);
assert.equal(pages.length, 3, "Le sitemap doit retenir une page par catégorie française");
assert.deepEqual(pages.map((page) => page.category), ["films", "series", "documentaires"]);

const html = `<!doctype html><script type="application/ld+json">
{"@context":"https://schema.org","@type":"Movie","name":"Film officiel","description":"Description officielle.","image":"https://assets.tv5mondeplus.com/poster.jpg","url":"https://www.tv5mondeplus.com/fr/films/drame/test-film","duration":"PT1H20M","uploadDate":"2026-11-01T10:00:00Z"}
</script>`;
const item = extractTv5MondePage(html, pages[0], now);
assert.equal(item.id, "tv5mondeplus-films-drame-test-film");
assert.equal(item.type, "movie");
assert.equal(item.expiryDate, null);
assert.equal(item.verifiedAt, now.toISOString());

const previous = { version: 4, lastUpdated: null, items: [item] };
const synced = syncTv5MondeCatalogue(previous, [], now);
assert.equal(synced.activeCount, 0);
assert.equal(synced.hiddenCount, 1);
assert.equal(synced.catalogue.items[0].verified, false);
assert.equal(synced.catalogue.items[0].verificationNote, "not_in_current_selection");

console.log("Tests TV5MONDE+ réussis : sitemap, métadonnées JSON-LD et masquage conformes.");
