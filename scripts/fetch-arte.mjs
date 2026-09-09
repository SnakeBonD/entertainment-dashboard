import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  arteHomeEndpoint,
  extractArteSelection,
  findArteSelectionEndpoint,
  syncArteCatalogue,
} from "./arte.mjs";
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

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SnakeBonD-Entertainment-Dashboard/0.6",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ARTE a répondu avec le statut HTTP ${response.status}.`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const homePayload = await fetchJson(arteHomeEndpoint);
const selectionEndpoint = findArteSelectionEndpoint(homePayload);
const selectionPayload = await fetchJson(selectionEndpoint);
const arteItems = extractArteSelection(selectionPayload, now);

if (!arteItems.length) {
  throw new Error(
    "Aucun programme ARTE actif et disponible en France n’a été confirmé ; les données existantes restent intactes.",
  );
}

const catalogue = readJson("data/catalogue.json");
const result = syncArteCatalogue(catalogue, arteItems, now);
const sourceStatus = updateSourceStatus(
  readJson("data/source-status.json"),
  "arte",
  now.toISOString(),
  result.activeCount,
);

if (!dryRun) {
  if (result.changed) {
    fs.writeFileSync(
      path.join(projectRoot, "data/catalogue.json"),
      `${JSON.stringify(result.catalogue, null, 2)}\n`,
    );
  }
  fs.writeFileSync(
    path.join(projectRoot, "data/source-status.json"),
    `${JSON.stringify(sourceStatus, null, 2)}\n`,
  );
}

const mode = dryRun ? "Simulation" : result.changed ? "Catalogue mis à jour" : "Catalogue inchangé";
console.log(
  `${mode} : ${result.activeCount} programme${result.activeCount > 1 ? "s" : ""} ARTE actif${result.activeCount > 1 ? "s" : ""}`
  + `${result.hiddenCount ? `, ${result.hiddenCount} entrée${result.hiddenCount > 1 ? "s" : ""} masquée${result.hiddenCount > 1 ? "s" : ""}` : ""}.`,
);
