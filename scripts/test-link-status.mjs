import assert from "node:assert/strict";
import { requestWithRetry, retryPolicy } from "./link-check.mjs";
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

assert.equal(retryPolicy.maxAttempts, 3);
let responseAttempts = 0;
const recoveredResponse = await requestWithRetry(
  async () => {
    responseAttempts += 1;
    return responseAttempts === 1 ? { status: 503, ok: false } : { status: 200, ok: true };
  },
  { delaysMs: [0, 0] },
);
assert.equal(recoveredResponse.status, 200);
assert.equal(responseAttempts, 2);

let networkAttempts = 0;
const recoveredNetwork = await requestWithRetry(
  async () => {
    networkAttempts += 1;
    if (networkAttempts < 3) throw new Error("timeout simulé");
    return { status: 204, ok: true };
  },
  { delaysMs: [0, 0] },
);
assert.equal(recoveredNetwork.status, 204);
assert.equal(networkAttempts, 3);

console.log("Contrôle des liens validé : reprises réseau, redirections, protections, erreurs temporaires et liens cassés distingués.");
