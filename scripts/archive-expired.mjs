import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(path.join(projectRoot, "js/availability.js"));

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

const catalogue = readJson("data/catalogue.json");
const archive = readJson("data/archive.json");
const result = globalThis.SnakeBonDAvailability.archiveExpired(catalogue, archive, now);

if (!dryRun && result.moved.length) {
  fs.writeFileSync(
    path.join(projectRoot, "data/catalogue.json"),
    `${JSON.stringify(result.catalogue, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(projectRoot, "data/archive.json"),
    `${JSON.stringify(result.archive, null, 2)}\n`,
  );
}

console.log(
  result.moved.length
    ? `${result.moved.length} contenu${result.moved.length > 1 ? "s" : ""} expiré${result.moved.length > 1 ? "s" : ""} ${dryRun ? "détecté(s)" : "archivé(s)"}.`
    : "Aucun contenu expiré à archiver.",
);
