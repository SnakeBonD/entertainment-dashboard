import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractTv5MondePage,
  parseTv5MondeSitemap,
  tv5MondeSitemapUrl,
  tv5MondeProvider,
  syncTv5MondeCatalogue,
} from "./tv5monde.mjs";
import { shouldPersistSourceStatus, updateSourceStatus } from "./source-status.mjs";

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

async function fetchText(url, accept) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: accept,
        "User-Agent": "SnakeBonD-Entertainment-Dashboard/0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TV5MONDE+ a répondu avec le statut HTTP ${response.status}.`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

const sitemap = await fetchText(tv5MondeSitemapUrl, "application/xml, text/xml;q=0.9");
const pages = parseTv5MondeSitemap(sitemap);
const results = await Promise.all(
  pages.map(async (page) => {
    try {
      const html = await fetchText(page.url, "text/html, application/xhtml+xml;q=0.9");
      return extractTv5MondePage(html, page, now);
    } catch (error) {
      console.warn(`TV5MONDE+ ignoré (${page.url}) : ${error.message}`);
      return null;
    }
  }),
);
const entries = results.filter(Boolean);

if (entries.length < 6) {
  throw new Error(
    `La sélection TV5MONDE+ est incomplète (${entries.length}/${pages.length}) ; les données existantes restent intactes.`,
  );
}

const catalogue = readJson("data/catalogue.json");
const result = syncTv5MondeCatalogue(catalogue, entries, now);
const previousSourceStatus = readJson("data/source-status.json");
const sourceStatus = updateSourceStatus(
  previousSourceStatus,
  tv5MondeProvider,
  now.toISOString(),
  result.activeCount,
);
const persistSourceStatus = result.changed
  || shouldPersistSourceStatus(previousSourceStatus, sourceStatus, tv5MondeProvider);

if (!dryRun) {
  if (result.changed) {
    fs.writeFileSync(
      path.join(projectRoot, "data/catalogue.json"),
      `${JSON.stringify(result.catalogue, null, 2)}\n`,
    );
  }
  if (persistSourceStatus) {
    fs.writeFileSync(
      path.join(projectRoot, "data/source-status.json"),
      `${JSON.stringify(sourceStatus, null, 2)}\n`,
    );
  }
}

const mode = dryRun ? "Simulation" : result.changed ? "Catalogue mis à jour" : "Catalogue inchangé";
console.log(
  `${mode} : ${result.activeCount} programmes TV5MONDE+ actifs`
    + `${result.hiddenCount ? `, ${result.hiddenCount} entrée${result.hiddenCount > 1 ? "s" : ""} masquée${result.hiddenCount > 1 ? "s" : ""}` : ""}.`,
);
