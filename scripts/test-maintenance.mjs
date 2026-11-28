import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  "scripts/validate.mjs",
  "scripts/test-availability.mjs",
  "scripts/test-epic-games.mjs",
  "scripts/test-arte.mjs",
  "scripts/test-radio-france.mjs",
  "scripts/test-tv5monde.mjs",
];

for (const check of checks) {
  const result = spawnSync(process.execPath, [check], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Impossible d’exécuter ${check} : ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Validation maintenance réussie : ${checks.length} contrôles partagés.`);
