import assert from "node:assert/strict";
import {
  extractRadioFranceFeed,
  radioFranceFeeds,
  syncRadioFranceSelection,
} from "./radio-france.mjs";

const now = new Date("2026-09-08T16:00:00.000Z");
const feed = radioFranceFeeds[0];

function item({
  guid,
  title,
  pubDate = "Tue, 08 Sep 2026 13:30:00 +0200",
  link = "https://www.radiofrance.fr/franceculture/podcasts/les-pieds-sur-terre/un-episode-1234567",
  explicit = "no",
  audioHost = "proxycast.radiofrance.fr",
  imageHost = "www.radiofrance.fr",
}) {
  return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>durée : 00:30:26 - Les pieds sur terre - par : Sonia Kronlund - Un récit documenté et accessible. - équipe : Radio France

Vous aimez ce podcast ? Pour écouter la suite, rendez-vous sur Radio France.</description>
      <enclosure url="https://${audioHost}/audio/${guid}.m4a" length="100" type="audio/x-m4a"/>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>00:30:26</itunes:duration>
      <itunes:explicit>${explicit}</itunes:explicit>
      <itunes:image href="https://${imageHost}/s3/cruiser-production/image.jpg"/>
    </item>`;
}

function rss(items, overrides = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
    <channel>
      <title>${overrides.title ?? feed.title}</title>
      <copyright>${overrides.copyright ?? "Radio France"}</copyright>
      <generator>${overrides.generator ?? "Radio France"}</generator>
      <itunes:author>${overrides.station ?? feed.station}</itunes:author>
      <itunes:image href="https://www.radiofrance.fr/s3/cruiser-production/channel.jpg"/>
      ${items.join("\n")}
    </channel>
  </rss>`;
}

const validGuid = "11111111-1111-4111-8111-111111111111";
const genericGuid = "22222222-2222-4222-8222-222222222222";
const episodes = extractRadioFranceFeed(rss([
  item({ guid: validGuid, title: "Épisode &amp; découverte" }),
  item({ guid: genericGuid, title: "Lien de repli", link: "https://www.radiofrance.fr" }),
  item({
    guid: "33333333-3333-4333-8333-333333333333",
    title: "Contenu explicite",
    explicit: "yes",
  }),
  item({
    guid: "44444444-4444-4444-8444-444444444444",
    title: "Épisode trop ancien",
    pubDate: "Sat, 01 Aug 2026 13:30:00 +0200",
  }),
]), feed, now, 3);

assert.equal(episodes.length, 2, "les entrées explicites ou trop anciennes doivent être exclues");
assert.equal(episodes[0].title, "Épisode & découverte", "les entités XML doivent être décodées");
assert.equal(episodes[0].durationLabel, "30 min", "la durée doit être normalisée");
assert.equal(episodes[0].description, "Un récit documenté et accessible.");
assert.equal(episodes[1].url, feed.landingUrl, "un lien générique doit revenir à la page de l’émission");
assert.equal(episodes[0].provider, "radio-france");

assert.throws(
  () => extractRadioFranceFeed(rss([], { generator: "Inconnu" }), feed, now),
  /source Radio France/,
  "un flux non signé par Radio France doit être refusé",
);
assert.throws(
  () => extractRadioFranceFeed("<html>Erreur</html>", feed, now),
  /RSS valide/,
  "une réponse non RSS doit être refusée",
);
assert.throws(
  () => extractRadioFranceFeed(rss([]), { ...feed, id: "flux-inconnu" }, now),
  /n’est pas autorisé/,
  "un flux non approuvé doit être refusé",
);

const initial = syncRadioFranceSelection({ version: 1, lastUpdated: null, items: [] }, episodes, now);
assert.equal(initial.changed, true);
assert.equal(initial.count, 2);

const stable = syncRadioFranceSelection(initial.selection, episodes.map((episode) => ({
  ...episode,
  verifiedAt: "2026-09-09T12:00:00.000Z",
})), new Date("2026-09-09T12:00:00.000Z"));
assert.equal(stable.changed, false, "un contrôle identique ne doit pas réécrire la sélection");
assert.equal(stable.selection.lastUpdated, initial.selection.lastUpdated);
assert.equal(stable.selection.items[0].verifiedAt, episodes[0].verifiedAt);

const changed = syncRadioFranceSelection(initial.selection, [{
  ...episodes[0],
  title: "Titre corrigé",
}], new Date("2026-09-09T12:00:00.000Z"));
assert.equal(changed.changed, true);
assert.equal(changed.selection.items.length, 1, "la sélection doit tourner sans créer de fausse expiration");
assert.equal(changed.selection.lastUpdated, "2026-09-09T12:00:00.000Z");

console.log("Tests Radio France réussis : RSS officiel, filtres, liens de repli et synchronisation stable.");
