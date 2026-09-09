import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const sources = [
  ["ARTE", ".github/workflows/fetch-arte.yml", 'cron: "41 */12 * * *"'],
  ["Epic Games", ".github/workflows/fetch-epic-games.yml", 'cron: "23 */6 * * *"'],
  ["Radio France", ".github/workflows/fetch-radio-france.yml", 'cron: "17 */6 * * *"'],
  ["Archivage", ".github/workflows/archive-expired.yml", 'cron: "40 5 * * *"'],
];

for (const [name, path, cron] of sources) {
  const workflow = read(path);
  assert(workflow.includes(cron), `${name} : planification absente`);
  assert(workflow.includes("workflow_dispatch:"), `${name} : lancement manuel absent`);
  assert(!workflow.includes("\n  push:"), `${name} : déclenchement push redondant`);
  assert(workflow.includes("contents: write"), `${name} : publication des données impossible`);
  assert(!workflow.includes("actions: write"), `${name} : permission Actions devenue inutile`);
  assert(!workflow.includes("gh workflow run deploy.yml"), `${name} : second déploiement explicite détecté`);
  assert(workflow.includes("git pull --rebase origin main"), `${name} : protection contre les mises à jour concurrentes absente`);
}

const deploy = read(".github/workflows/deploy.yml");
assert(deploy.includes("push:\n    branches: [main]"), "Le déploiement automatique de main est absent");
assert(deploy.includes("pull_request:\n    branches: [main]"), "La validation des pull requests est absente");
assert(deploy.includes("workflow_dispatch:"), "Le déploiement manuel de secours est absent");

console.log("Workflows v1.3 validés : planifications isolées et un seul déploiement par publication.");
