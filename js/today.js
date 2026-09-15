(() => {
  "use strict";
  const STORAGE_KEY = "snakebond-today-dismissed-v1";
  const FILTER_STORAGE_KEY = "snakebond-today-filter-v1";
  const FILTERS = new Set(["all", "tracked", "new", "lastChance", "epic", "podcast"]);
  const time = (value) => new Date(value).getTime();
  const dayKey = (value = new Date()) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  function build({ catalogue = { items: [] }, podcasts = { items: [] }, now = new Date(), isTracked = () => false, isFavorite = () => false }) {
    const nowTime = now.getTime();
    const contents = (catalogue.items ?? []).filter((item) => item.verified && (!item.expiryDate || time(item.expiryDate) >= nowTime)).map((item) => {
      const days = item.expiryDate ? Math.ceil((time(item.expiryDate) - nowTime) / 86400000) : Infinity;
      const addedDays = item.addedDate ? Math.floor((nowTime - time(item.addedDate)) / 86400000) : Infinity;
      const tracked = isTracked(item.id) || isFavorite(item.platform);
      const group = item.provider === "epic-games-store" ? "epic" : days <= 7 ? "lastChance" : addedDays <= 7 ? "new" : null;
      return group ? { ...item, group, tracked, priority: (tracked ? 1000 : 0) + (group === "lastChance" ? 300 - days : group === "epic" ? 200 : 100 - addedDays) } : null;
    }).filter(Boolean);
    const recentPodcasts = (podcasts.items ?? []).filter((item) => nowTime - time(item.publishedAt) <= 7 * 86400000).map((item) => ({ ...item, group: "podcast", tracked: false, priority: 50 + time(item.publishedAt) / 1e12 }));
    return [...contents, ...recentPodcasts].sort((a, b) => b.priority - a.priority);
  }
  function filter(items, value = "all") {
    if (value === "all") return items;
    if (value === "tracked") return items.filter((item) => item.tracked);
    return items.filter((item) => item.group === value);
  }
  function readFilter(storage = window.localStorage) {
    try {
      const value = storage.getItem(FILTER_STORAGE_KEY) || "all";
      return FILTERS.has(value) ? value : "all";
    } catch { return "all"; }
  }
  function writeFilter(value, storage = window.localStorage) {
    const safeValue = FILTERS.has(value) ? value : "all";
    try { storage.setItem(FILTER_STORAGE_KEY, safeValue); } catch { /* préférence non persistée */ }
    return safeValue;
  }
  function readDismissed(storage = window.localStorage, now = new Date()) {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      if (parsed?.date !== dayKey(now) || !Array.isArray(parsed?.ids)) return [];
      return [...new Set(parsed.ids.filter((id) => typeof id === "string"))];
    } catch { return []; }
  }
  function dismiss(id, storage = window.localStorage, now = new Date()) {
    const ids = [...new Set([...readDismissed(storage, now), id])];
    storage.setItem(STORAGE_KEY, JSON.stringify({ date: dayKey(now), ids }));
    return ids;
  }
  function restore(id, storage = window.localStorage, now = new Date()) {
    const ids = readDismissed(storage, now).filter((dismissedId) => dismissedId !== id);
    if (ids.length) storage.setItem(STORAGE_KEY, JSON.stringify({ date: dayKey(now), ids }));
    else storage.removeItem(STORAGE_KEY);
    return ids;
  }
  function clearDismissed(storage = window.localStorage) {
    storage.removeItem(STORAGE_KEY);
  }
  function visible(items, dismissedIds = []) {
    const hidden = new Set(dismissedIds);
    return items.filter((item) => !hidden.has(item.id));
  }
  function pick(items, offset = 0) {
    if (!items.length) return null;
    const index = Math.abs(Number.isFinite(offset) ? Math.trunc(offset) : 0) % items.length;
    return items[index];
  }
  function explain(item) {
    if (!item) return "";
    if (item.tracked) return "Dans tes priorités personnelles.";
    if (item.group === "lastChance") return "À voir avant sa prochaine expiration.";
    if (item.group === "epic") return "Jeu temporairement offert sur Epic Games Store.";
    if (item.group === "new") return "Ajout récent au catalogue vérifié.";
    if (item.group === "podcast") return "Épisode récent publié par Radio France.";
    return "Suggestion issue du catalogue vérifié.";
  }
  window.SnakeBonDToday = { build, filter, readFilter, writeFilter, readDismissed, dismiss, restore, clearDismissed, visible, pick, explain };
})();
