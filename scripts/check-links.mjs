import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platforms = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/platforms.json"), "utf8"));
const reportPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const protectedStatuses = new Set([401, 403, 429]);
const entries = Object.entries(platforms).flatMap(([category, items]) =>
  items.map((platform) => ({ category, ...platform })),
);

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: {
      "user-agent": "SnakeBonD-Entertainment-LinkCheck/2.0 (+https://entertainment.snakebond.net)",
      ...(method === "GET" ? { range: "bytes=0-2048" } : {}),
    },
  });
}

async function check(entry) {
  try {
    let response = await request(entry.url, "HEAD");
    if (!response.ok && !protectedStatuses.has(response.status)) {
      response = await request(entry.url, "GET");
    }

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return { ...entry, state: "ok", status: response.status, finalUrl: response.url };
    }
    if (protectedStatuses.has(response.status)) {
      return { ...entry, state: "protected", status: response.status, finalUrl: response.url };
    }
    return { ...entry, state: "failed", status: response.status, finalUrl: response.url };
  } catch (error) {
    return { ...entry, state: "failed", status: "—", error: error.message, finalUrl: entry.url };
  }
}

async function checkWithLimit(items, limit = 5) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await check(items[index]);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

const results = await checkWithLimit(entries);
const counts = {
  ok: results.filter((result) => result.state === "ok").length,
  protected: results.filter((result) => result.state === "protected").length,
  failed: results.filter((result) => result.state === "failed").length,
};
const icon = { ok: "✅", protected: "⚠️", failed: "❌" };
const lines = [
  "# Contrôle des liens du catalogue",
  "",
  `Date : ${new Date().toISOString()}`,
  "",
  `- ${counts.ok} accessibles`,
  `- ${counts.protected} protégés contre les robots`,
  `- ${counts.failed} en échec`,
  "",
  "| État | Catégorie | Plateforme | HTTP | Destination |",
  "| --- | --- | --- | ---: | --- |",
  ...results.map((result) =>
    `| ${icon[result.state]} | ${result.category} | ${result.name} | ${result.status} | ${result.finalUrl} |`,
  ),
  "",
];
const report = lines.join("\n");

if (reportPath) fs.writeFileSync(reportPath, report, "utf8");
console.log(`Liens contrôlés : ${counts.ok} accessibles, ${counts.protected} protégés, ${counts.failed} en échec.`);
if (counts.failed) process.exitCode = 1;
