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

const checkLinks = read(".github/workflows/check-links.yml");
const workflows = [
  ["Archivage", read(".github/workflows/archive-expired.yml")],
  ["Contrôle des liens", checkLinks],
  ["Déploiement", deploy],
  ["ARTE", read(".github/workflows/fetch-arte.yml")],
  ["Epic Games", read(".github/workflows/fetch-epic-games.yml")],
  ["Radio France", read(".github/workflows/fetch-radio-france.yml")],
];
for (const [name, workflow] of workflows) {
  assert(!/uses:\s+actions\/[^@\s]+@v\d/.test(workflow), `${name} : une Action GitHub utilise encore un tag mutable`);
  for (const match of workflow.matchAll(/uses:\s+actions\/[^@\s]+@([0-9a-f]+)/g)) {
    assert.equal(match[1].length, 40, `${name} : une Action GitHub n’est pas épinglée sur un SHA complet`);
  }
}

const dependabot = read(".github/dependabot.yml");
assert(dependabot.includes("package-ecosystem: github-actions"), "Dependabot ne surveille pas les Actions GitHub");
assert(dependabot.includes("interval: weekly"), "Dependabot ne vérifie pas les Actions GitHub chaque semaine");

console.log("Workflows v1.8.1 validés : chaque publication de données déclenche exactement un déploiement Pages.");
