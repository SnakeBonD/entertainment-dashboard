(() => {
  "use strict";

  const storageKey = "snakebondEntertainmentWatchlist";
  const visitKey = "snakebondEntertainmentLastVisit";
  const allowedStatuses = new Set(["discover", "progress", "done", "hidden"]);

  function sanitize(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([id, entry]) => {
      if (!id || !entry || typeof entry !== "object" || !allowedStatuses.has(entry.status)) return [];
      return [[id, {
        status: entry.status,
        title: typeof entry.title === "string" ? entry.title : "Contenu suivi",
        platform: typeof entry.platform === "string" ? entry.platform : "Plateforme inconnue",
        updatedAt: Number.isFinite(Date.parse(entry.updatedAt)) ? entry.updatedAt : new Date(0).toISOString(),
      }]];
    }));
  }

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      return sanitize(value);
    } catch {
      return {};
    }
  }

  function write(entries) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      return false;
    }
    window.dispatchEvent(new CustomEvent("snakebond:watchlist-changed"));
    return true;
  }

  function get(itemId) {
    return read()[itemId] ?? null;
  }

  function set(item, status) {
    if (!item?.id || !allowedStatuses.has(status)) return false;
    const entries = read();
    entries[item.id] = {
      status,
      title: item.title,
      platform: item.platform,
      updatedAt: new Date().toISOString(),
    };
    return write(entries);
  }

  function remove(itemId) {
    const entries = read();
    if (!entries[itemId]) return true;
    delete entries[itemId];
    return write(entries);
  }

  function replace(entries) {
    return write(sanitize(entries));
  }

  function list(catalogueItems = [], archiveItems = []) {
    const entries = read();
    const byId = new Map([...catalogueItems, ...archiveItems].map((item) => [item.id, item]));
    return Object.entries(entries).map(([id, entry]) => ({
      ...entry,
      id,
      item: byId.get(id) ?? null,
    }));
  }

  function readLastVisit() {
    const value = localStorage.getItem(visitKey);
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  }

  function recordVisit(date = new Date()) {
    try {
      localStorage.setItem(visitKey, date.toISOString());
      return true;
    } catch {
      return false;
    }
  }

  function newSince(items, lastVisit, now = new Date()) {
    const threshold = lastVisit
      ? Date.parse(lastVisit)
      : now.getTime() - (7 * 24 * 60 * 60 * 1000);
    return items.filter((item) => item.verified !== false && Date.parse(item.addedDate) > threshold);
  }

  window.SnakeBonDWatchlist = {
    get,
    list,
    newSince,
    read,
    readLastVisit,
    recordVisit,
    remove,
    replace,
    sanitize,
    set,
    storageKey,
    statusLabels: {
      discover: "À découvrir",
      progress: "En cours",
      done: "Terminé",
      hidden: "Masqué",
    },
  };
})();
