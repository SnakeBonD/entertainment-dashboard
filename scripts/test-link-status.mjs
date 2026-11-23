import assert from "node:assert/strict";
import { classifyLinkStatus } from "./link-status.mjs";

assert.equal(classifyLinkStatus(200, true), "ok");
assert.equal(classifyLinkStatus(301), "ok");
assert.equal(classifyLinkStatus(401), "protected");
assert.equal(classifyLinkStatus(403), "protected");
assert.equal(classifyLinkStatus(429), "protected");
assert.equal(classifyLinkStatus(500), "temporary");
assert.equal(classifyLinkStatus(503), "temporary");
assert.equal(classifyLinkStatus(504), "temporary");
assert.equal(classifyLinkStatus(404), "failed");
assert.equal(classifyLinkStatus(410), "failed");

console.log("Contrôle des liens validé : redirections, protections, erreurs temporaires et liens cassés distingués.");
