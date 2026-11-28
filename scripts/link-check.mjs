import { classifyLinkStatus } from "./link-status.mjs";

export const retryPolicy = Object.freeze({
  maxAttempts: 3,
  delaysMs: [250, 750],
});

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function shouldRetryLinkResponse(response) {
  return classifyLinkStatus(response.status, response.ok) === "temporary" || response.status === 429;
}

export async function requestWithRetry(request, options = {}) {
  const maxAttempts = options.maxAttempts ?? retryPolicy.maxAttempts;
  const delaysMs = options.delaysMs ?? retryPolicy.delaysMs;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await request();
      if (attempt === maxAttempts - 1 || !shouldRetryLinkResponse(response)) return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts - 1) throw error;
    }

    const delayMs = delaysMs[Math.min(attempt, delaysMs.length - 1)] ?? 0;
    if (delayMs > 0) await wait(delayMs);
  }

  throw lastError ?? new Error("Le contrôle du lien n’a produit aucune réponse.");
}
