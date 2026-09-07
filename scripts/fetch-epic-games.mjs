import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  epicGamesEndpoint,
  extractEpicGames,
  syncEpicCatalogue,
} from "./epic-games.mjs";

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

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 25_000);
let response;

try {
  response = await fetch(epicGamesEndpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SnakeBonD-Entertainment-Dashboard/0.5",
    },
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}

if (!response.ok) {
  throw new Error(`Epic Games a répondu avec le statut HTTP ${response.status}.`);
}

const payload = await response.json();
const epicGames = extractEpicGames(payload, now);

if (!epicGames.length) {
  throw new Error(
    "Aucun jeu temporairement gratuit n’a été confirmé dans le flux Epic Games ; les données existantes restent intactes.",
  );
}

const catalogue = readJson("data/catalogue.json");
const result = syncEpicCatalogue(catalogue, epicGames, now);

if (result.changed && !dryRun) {
  fs.writeFileSync(
    path.join(projectRoot, "data/catalogue.json"),
    `${JSON.stringify(result.catalogue, null, 2)}\n`,
  );
}

const mode = dryRun ? "Simulation" : result.changed ? "Catalogue mis à jour" : "Catalogue inchangé";
console.log(
  `${mode} : ${result.activeCount} jeu${result.activeCount > 1 ? "x" : ""} Epic Games actif${result.activeCount > 1 ? "s" : ""}`
  + `${result.hiddenCount ? `, ${result.hiddenCount} entrée${result.hiddenCount > 1 ? "s" : ""} masquée${result.hiddenCount > 1 ? "s" : ""}` : ""}.`,
);
