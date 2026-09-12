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
  assert(workflow.includes("actions: write"), `${name} : déclenchement du déploiement impossible`);
  assert(workflow.includes("if: steps.publish.outputs.changed == 'true'"), `${name} : déploiement non conditionné à une modification réelle`);
  assert(workflow.includes("GH_TOKEN: ${{ github.token }}"), `${name} : authentification du déploiement absente`);
  assert.equal(
    workflow.match(/gh workflow run deploy\.yml --ref main/g)?.length,
    1,
    `${name} : le déploiement doit être déclenché exactement une fois`,
  );
  assert(workflow.includes("git pull --rebase origin main"), `${name} : protection contre les mises à jour concurrentes absente`);
}

const deploy = read(".github/workflows/deploy.yml");
assert(deploy.includes("push:\n    branches: [main]"), "Le déploiement automatique de main est absent");
assert(deploy.includes("pull_request:\n    branches: [main]"), "La validation des pull requests est absente");
assert(deploy.includes("workflow_dispatch:"), "Le déploiement manuel de secours est absent");

console.log("Workflows v1.8.1 validés : chaque publication de données déclenche exactement un déploiement Pages.");
