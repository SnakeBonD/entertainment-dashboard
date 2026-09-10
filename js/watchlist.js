(() => {
  "use strict";

  const storageKey = "snakebondEntertainmentWatchlist";
  const visitKey = "snakebondEntertainmentLastVisit";
  const allowedStatuses = new Set(["discover", "progress", "done", "hidden"]);

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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
    set,
    statusLabels: {
      discover: "À découvrir",
      progress: "En cours",
      done: "Terminé",
      hidden: "Masqué",
    },
  };
})();
