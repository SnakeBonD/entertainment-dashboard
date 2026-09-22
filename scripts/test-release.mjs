import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const domain = "https://entertainment.snakebond.net/";

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const indexHtml = read("index.html");
const readme = read("README.md");
const serviceWorker = read("service-worker.js");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const deploy = read(".github/workflows/deploy.yml");

assert(indexHtml.includes('aria-label="Version 3.0">v3.0'), "La version visible doit être v3.0");
assert(indexHtml.includes("v3.0 · Programme du jour"), "Le pied de page v3.0 est absent");
assert(!indexHtml.includes("v0.8"), "Le HTML contient encore une version v0.8");
assert(readme.includes("version **v3.0**"), "Le README ne présente pas la v3.0");
assert(serviceWorker.includes('`${CACHE_PREFIX}v3.0.0`'), "Le cache applicatif n’est pas en v3.0.0");

[
  "application",
  "application-title",
  "install-app-page",
  "app-install-state",
  "app-offline-state",
  "app-update-state",
  "check-app-update",
  "app-action-status",
  "source-health-summary",
  "source-health-grid",
  "agenda",
  "agenda-window",
  "agenda-tracked-only",
  "agenda-container",
  "format",
  "priority",
  "recommendation-results",
  "export-local-data",
  "import-local-data",
  "backup-dialog",
  "backup-preview",
  "confirm-backup-import",
  "export-agenda-calendar",
  "agenda-calendar-status",
  "global-search-input",
  "global-search-type",
  "global-search-results",
  "today-results",
  "today-reset",
  "today-notice",
  "today-undo",
  "today-pick",
  "today-pick-result",
  "today-pick-title",
  "today-pick-link",
  "today-pick-reason",
  "today-pick-dismiss",
  "today-pick-watchlist",
  "today-pick-program",
  "today-program",
  "today-program-title",
  "today-program-count",
  "today-program-list",
  "today-program-clear",
].forEach((id) => assert(indexHtml.includes(`id="${id}"`), `Contrôle stable absent : #${id}`));

const ids = [...indexHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicates.length === 0, `Identifiants HTML en double : ${[...new Set(duplicates)].join(", ")}`);

assert(indexHtml.includes(`<link rel="canonical" href="${domain}">`), "L’URL canonique est absente");
assert(indexHtml.includes(`<meta property="og:url" content="${domain}">`), "L’URL Open Graph est absente");
assert(indexHtml.includes('<meta name="robots" content="index, follow">'), "La consigne d’indexation est absente");
assert(indexHtml.includes('<meta name="twitter:card" content="summary">'), "La carte sociale minimale est absente");
assert(robots.includes(`Sitemap: ${domain}sitemap.xml`), "robots.txt ne référence pas le sitemap public");
assert(sitemap.includes(`<loc>${domain}</loc>`), "Le sitemap ne référence pas la racine publique");
assert(sitemap.includes("<lastmod>2026-09-11</lastmod>"), "La date du sitemap est invalide");

const externalBlankLinks = [...indexHtml.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((match) => match[0]);
externalBlankLinks.forEach((link) => {
  assert(/rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(link), `Lien externe non protégé : ${link}`);
});

assert(deploy.includes("node scripts/test-release.mjs"), "Le test de version stable n’est pas exécuté par la CI");
assert(deploy.includes("robots.txt sitemap.xml _site/"), "Les métadonnées publiques ne sont pas publiées");

if (failures.length) {
  console.error("Certification v3.0 échouée :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Certification v3.0 réussie : ${ids.length} identifiants uniques, programme quotidien et fonctions historiques conformes.`);
