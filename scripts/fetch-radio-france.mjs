import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRadioFranceFeed,
  radioFranceFeeds,
  syncRadioFranceSelection,
} from "./radio-france.mjs";
import { updateSourceStatus } from "./source-status.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const nowIndex = process.argv.indexOf("--now");
const now = nowIndex >= 0 ? new Date(process.argv[nowIndex + 1]) : new Date();

if (Number.isNaN(now.getTime())) {
  console.error("La date passée avec --now est invalide.");
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

async function fetchXml(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(feed.feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": "SnakeBonD-Entertainment-Dashboard/0.7",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${feed.title} a répondu avec le statut HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("xml")) {
      throw new Error(`${feed.title} n’a pas renvoyé un flux XML.`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

const feeds = await Promise.all(
  radioFranceFeeds.map(async (feed) => ({ feed, xml: await fetchXml(feed) })),
);
const episodes = feeds.flatMap(({ feed, xml }) => extractRadioFranceFeed(xml, feed, now, 3));

if (episodes.length !== radioFranceFeeds.length * 3) {
  throw new Error(
    `La sélection Radio France est incomplète (${episodes.length}/${radioFranceFeeds.length * 3}) ; les données existantes restent intactes.`,
  );
}

const selection = readJson("data/radio-france.json");
const result = syncRadioFranceSelection(selection, episodes, now);
const sourceStatus = updateSourceStatus(
  readJson("data/source-status.json"),
  "radio-france",
  now.toISOString(),
  result.count,
);

if (!dryRun) {
  if (result.changed) {
    fs.writeFileSync(
      path.join(projectRoot, "data/radio-france.json"),
      `${JSON.stringify(result.selection, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(projectRoot, "data/source-status.json"),
    `${JSON.stringify(sourceStatus, null, 2)}\n`,
  );
}

const mode = dryRun ? "Simulation" : result.changed ? "Sélection mise à jour" : "Sélection inchangée";
console.log(`${mode} : ${result.count} épisodes Radio France vérifiés.`);
