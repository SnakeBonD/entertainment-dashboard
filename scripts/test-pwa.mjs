import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function pngDimensions(relativePath) {
  const image = fs.readFileSync(path.join(projectRoot, relativePath));
  assert(image.subarray(1, 4).toString("ascii") === "PNG", `${relativePath} n’est pas un PNG`);
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

const manifest = JSON.parse(read("manifest.webmanifest"));
assert(manifest.name === "SnakeBonD Entertainment", "Le nom complet de la PWA est invalide");
assert(manifest.short_name === "SnakeBonD", "Le nom court de la PWA est invalide");
assert(manifest.lang === "fr", "La langue de la PWA doit être le français");
assert(manifest.id === "./", "L’identifiant de la PWA doit rester relatif au domaine");
assert(manifest.start_url === "./", "Le démarrage de la PWA doit viser la racine publiée");
assert(manifest.scope === "./", "Le périmètre de la PWA doit couvrir le dashboard");
assert(manifest.display === "standalone", "La PWA doit démarrer en mode standalone");
assert(manifest.theme_color === "#080a10", "La couleur de thème ne correspond pas à l’interface");
assert(manifest.background_color === "#080a10", "La couleur de fond ne correspond pas à l’interface");

const expectedIcons = [
  ["assets/pwa-icon-192.png", 192],
  ["assets/pwa-icon-512.png", 512],
];

expectedIcons.forEach(([relativePath, size]) => {
  const icon = manifest.icons?.find((entry) => entry.src === relativePath);
  assert(Boolean(icon), `${relativePath} est absent du manifeste`);
  assert(icon?.sizes === `${size}x${size}`, `${relativePath} possède une taille déclarée invalide`);
  assert(icon?.type === "image/png", `${relativePath} doit être déclaré comme PNG`);
  assert(icon?.purpose?.includes("maskable"), `${relativePath} doit être compatible avec les icônes adaptatives`);
  assert(fs.existsSync(path.join(projectRoot, relativePath)), `${relativePath} est absent`);
  if (fs.existsSync(path.join(projectRoot, relativePath))) {
    const dimensions = pngDimensions(relativePath);
    assert(dimensions.width === size && dimensions.height === size, `${relativePath} ne mesure pas ${size} × ${size}`);
  }
});

const indexHtml = read("index.html");
assert(indexHtml.includes('rel="manifest" href="manifest.webmanifest"'), "Le manifeste n’est pas relié au HTML");
assert(indexHtml.includes('rel="apple-touch-icon" href="assets/pwa-icon-192.png"'), "L’icône Apple est absente");
assert(indexHtml.includes('id="install-app"'), "Le bouton d’installation est absent");
assert(indexHtml.includes('id="connection-status"'), "L’état de connexion est absent");
assert(indexHtml.includes('src="js/pwa.js"'), "Le contrôleur PWA n’est pas chargé");
assert(indexHtml.includes("v0.8"), "La version v0.8 est absente du HTML");

const pwaScript = read("js/pwa.js");
assert(pwaScript.includes("beforeinstallprompt"), "L’invite d’installation n’est pas gérée");
assert(pwaScript.includes("appinstalled"), "La fin d’installation n’est pas gérée");
assert(pwaScript.includes('register("service-worker.js"'), "Le service worker n’est pas enregistré");
assert(pwaScript.includes('updateViaCache: "none"'), "La vérification du service worker pourrait être mise en cache");
assert(pwaScript.includes("registration.update()"), "La recherche explicite de mise à jour est absente");
assert(pwaScript.includes("controllerchange"), "L’application d’une nouvelle version n’est pas gérée");

const serviceWorker = read("service-worker.js");
assert(serviceWorker.includes('CACHE_NAME = `${CACHE_PREFIX}v0.8.0`'), "La version du cache v0.8 est absente");
assert(serviceWorker.includes("cache.addAll(APP_SHELL)"), "Le préchargement hors ligne est absent");
assert(serviceWorker.includes("self.skipWaiting()"), "L’activation immédiate d’une mise à jour est absente");
assert(serviceWorker.includes("self.clients.claim()"), "La prise de contrôle immédiate est absente");
assert(serviceWorker.includes("url.origin !== self.location.origin"), "Les ressources externes ne sont pas exclues du cache");
assert(serviceWorker.includes("await fetch(request)"), "La stratégie ne donne pas la priorité au réseau");
assert(serviceWorker.includes('caches.match("./index.html")'), "Le repli de navigation hors ligne est absent");

const shellSource = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/)?.[1] ?? "";
const shellAssets = [...shellSource.matchAll(/"\.\/(.*?)"/g)].map((match) => match[1]);
assert(shellAssets.length >= 20, "Le shell hors ligne est incomplet");
shellAssets.filter(Boolean).forEach((relativePath) => {
  assert(fs.existsSync(path.join(projectRoot, relativePath)), `Ressource du cache absente : ${relativePath}`);
});

[
  "data/platforms.json",
  "data/platform-metadata.json",
  "data/recommendations.json",
  "data/schedule.json",
  "data/catalogue.json",
  "data/archive.json",
  "data/radio-france.json",
].forEach((relativePath) => {
  assert(shellAssets.includes(relativePath), `${relativePath} n’est pas disponible hors ligne`);
});

const deployWorkflow = read(".github/workflows/deploy.yml");
assert(deployWorkflow.includes("node scripts/test-pwa.mjs"), "Le déploiement n’exécute pas les tests PWA");
assert(
  deployWorkflow.includes("cp index.html CNAME manifest.webmanifest service-worker.js _site/"),
  "Le manifeste ou le service worker n’est pas ajouté au paquet GitHub Pages",
);
assert(deployWorkflow.includes("cp -R assets css js data _site/"), "Les icônes PWA ne sont pas ajoutées au paquet GitHub Pages");

if (failures.length) {
  console.error("Tests PWA échoués :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tests PWA réussis : manifeste valide, ${shellAssets.length} routes préchargées et mise à jour réseau prioritaire.`);
