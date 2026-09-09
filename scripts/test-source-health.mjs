import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { updateSourceStatus, validateSourceStatus } from "./source-status.mjs";

const sourceStatus = JSON.parse(fs.readFileSync(new URL("../data/source-status.json", import.meta.url), "utf8"));
assert.equal(validateSourceStatus(sourceStatus), true);

const updated = updateSourceStatus(
  sourceStatus,
  "arte",
  "2026-09-09T10:00:00.000Z",
  8,
);
assert.equal(updated.sources.find((source) => source.provider === "arte").itemCount, 8);
assert.equal(updated.sources.length, 3);

const source = fs.readFileSync(new URL("../js/source-health.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const health = context.window.SnakeBonDSourceHealth;
const now = new Date("2026-09-09T12:00:00.000Z");
const summary = health.summarize({
  sources: [
    { lastSuccessfulCheck: "2026-09-09T10:00:00.000Z", warningAfterHours: 18, itemCount: 2 },
    { lastSuccessfulCheck: "2026-09-07T10:00:00.000Z", warningAfterHours: 18, itemCount: 1 },
    { lastSuccessfulCheck: null, warningAfterHours: 18, itemCount: 0 },
  ],
}, now);
assert.equal(summary.fresh, 1);
assert.equal(summary.warning, 1);
assert.equal(summary.unavailable, 1);
assert.equal(summary.sources[0].statusLabel, "À jour");
assert.equal(summary.sources[1].relativeLabel, "Contrôlé il y a 2 jours");

console.log("Suivi des sources v1.3 validé : schéma, fraîcheur et états conformes.");
