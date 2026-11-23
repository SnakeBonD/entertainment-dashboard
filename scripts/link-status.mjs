const protectedStatuses = new Set([401, 403, 429]);

export function classifyLinkStatus(status, ok = false) {
  if (ok || (status >= 300 && status < 400)) return "ok";
  if (protectedStatuses.has(status)) return "protected";
  if (status >= 500 && status < 600) return "temporary";
  return "failed";
}
