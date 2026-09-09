import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const html = read("index.html");
const css = read("css/style.css");
const app = read("js/app.js");

assert(html.includes('data-tab="accueil" aria-current="page"'), "La page active initiale n’est pas annoncée");
assert((html.match(/<caption class="visually-hidden">/g) ?? []).length === 3, "Les trois tableaux doivent avoir une légende");
assert((html.match(/class="table-wrap" role="region"/g) ?? []).length === 3, "Les tableaux défilants doivent être des régions accessibles");
assert((html.match(/class="table-wrap"[^>]*tabindex="0"/g) ?? []).length === 3, "Les tableaux défilants doivent être accessibles au clavier");
assert((html.match(/aria-live="polite" aria-atomic="true"/g) ?? []).length >= 2, "Les compteurs dynamiques doivent être annoncés entièrement");
assert(html.includes('id="error-page" class="page" aria-labelledby="error-title" role="alert"'), "L’erreur de chargement n’est pas annoncée");

assert(css.includes("summary:focus-visible"), "Le résumé des filtres n’a pas d’indicateur de focus");
assert(css.includes(".table-wrap:focus-visible"), "Les tableaux défilants n’ont pas d’indicateur de focus");
assert(css.includes("button:disabled"), "Les contrôles désactivés n’ont pas d’état visuel");
assert(css.includes("@media (prefers-reduced-motion: reduce)"), "La réduction des animations n’est pas respectée");

assert(app.includes("function scheduleFrame(callback)"), "Le regroupement des recherches dans une frame est absent");
assert(app.includes("window.requestAnimationFrame"), "La recherche n’utilise pas requestAnimationFrame");
assert(app.includes("window.cancelAnimationFrame"), "Une recherche obsolète n’est pas annulée");
assert(app.includes('heading.focus({ preventScroll: true })'), "Le focus n’est pas transféré vers la nouvelle page");
assert(app.includes('openTab(initialTab || "accueil", false)'), "La navigation initiale n’est pas synchronisée");
assert((app.match(/\.loading = "lazy"/g) ?? []).length >= 2, "Les images distantes ne sont pas chargées paresseusement");
assert((app.match(/\.decoding = "async"/g) ?? []).length >= 2, "Le décodage asynchrone des images est incomplet");
assert(app.includes('audio.preload = "none"'), "Les podcasts chargent inutilement l’audio au démarrage");

const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1]);
assert(scripts.length >= 8 && scripts.every((attributes) => /\bdefer\b/.test(attributes)), "Tous les scripts locaux doivent être différés");

if (failures.length) {
  console.error("Audit qualité v1.3 échoué :");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Audit qualité v1.3 réussi : navigation, focus, tableaux, recherches et médias conformes.");
