import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/global-search.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const search = context.window.SnakeBonDGlobalSearch;
const index = search.buildIndex({
  platforms: { Films: [{ name: "ARTE", best: "Cinéma européen", premium: "Sans publicité", url: "https://arte.tv" }] },
  catalogue: { items: [{ id: "film-1", title: "Été brûlant", platform: "ARTE", type: "movie", description: "Drame", url: "https://arte.tv/film" }] },
  radioFrance: { items: [{ id: "pod-1", title: "L'histoire oubliée", station: "France Culture", podcastTitle: "Le Cours de l'histoire", description: "Archives", url: "https://radiofrance.fr/podcast" }] },
});

assert.equal(index.length, 3);
assert.equal(search.search(index, "cinema").length, 1, "La recherche doit ignorer les accents");
assert.equal(search.search(index, "ete brulant", "content")[0].title, "Été brûlant");
assert.equal(search.search(index, "france histoire", "podcast")[0].kind, "podcast");
assert.equal(search.search(index, "arte", "podcast").length, 0, "Le filtre par type doit être strict");
assert.equal(search.search(index, "").length, 0, "Une recherche vide ne doit rien afficher");

console.log("Recherche globale v1.9 validée : index unifié, accents, termes multiples et filtres conformes.");
