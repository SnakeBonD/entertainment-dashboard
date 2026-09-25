(() => {
  "use strict";

  const STORAGE_KEY = "snakebond-today-program-v1";
  const MAX_ITEMS = 3;
  const dayKey = (value = new Date()) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const sanitizeItem = (item) => {
    if (!item?.id || typeof item.title !== "string" || typeof item.url !== "string") return null;
    return {
      id: item.id,
      title: item.title,
      meta: typeof item.meta === "string" ? item.meta : "Source officielle",
      url: item.url,
      group: typeof item.group === "string" ? item.group : "new",
      done: item.done === true,
    };
  };
  function read(storage = window.localStorage, now = new Date()) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      if (value?.date !== dayKey(now) || !Array.isArray(value?.items)) return [];
      const seen = new Set();
      return value.items.flatMap((item) => {
        const safe = sanitizeItem(item);
        if (!safe || seen.has(safe.id)) return [];
        seen.add(safe.id);
        return [safe];
      }).slice(0, MAX_ITEMS);
    } catch { return []; }
  }
  function write(items, storage = window.localStorage, now = new Date()) {
    try {
      if (items.length) storage.setItem(STORAGE_KEY, JSON.stringify({ date: dayKey(now), items }));
      else storage.removeItem(STORAGE_KEY);
      return true;
    } catch { return false; }
  }
  function add(item, storage = window.localStorage, now = new Date()) {
    const safe = sanitizeItem(item);
    const items = read(storage, now);
    if (!safe) return { status: "invalid", items };
    if (items.some((entry) => entry.id === safe.id)) return { status: "duplicate", items };
    if (items.length >= MAX_ITEMS) return { status: "full", items };
    const next = [...items, safe];
    return { status: write(next, storage, now) ? "added" : "error", items: next };
  }
  function remove(id, storage = window.localStorage, now = new Date()) {
    const next = read(storage, now).filter((item) => item.id !== id);
    write(next, storage, now);
    return next;
  }
  function move(id, direction, storage = window.localStorage, now = new Date()) {
    const items = read(storage, now);
    const sourceIndex = items.findIndex((item) => item.id === id);
    const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    const targetIndex = sourceIndex + offset;
    if (!offset || sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return items;
    const next = [...items];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    write(next, storage, now);
    return next;
  }
  function toggleDone(id, storage = window.localStorage, now = new Date()) {
    const items = read(storage, now);
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return items;
    const next = items.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item);
    write(next, storage, now);
    return next;
  }
  function setAllDone(done, storage = window.localStorage, now = new Date()) {
    const items = read(storage, now);
    if (!items.length || typeof done !== "boolean") return items;
    const next = items.map((item) => ({ ...item, done }));
    write(next, storage, now);
    return next;
  }
  function replace(items, storage = window.localStorage, now = new Date()) {
    if (!Array.isArray(items)) return false;
    const seen = new Set();
    const safeItems = items.flatMap((item) => {
      const safe = sanitizeItem(item);
      if (!safe || seen.has(safe.id)) return [];
      seen.add(safe.id);
      return [safe];
    }).slice(0, MAX_ITEMS);
    return write(safeItems, storage, now);
  }
  function clear(storage = window.localStorage) {
    try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
  }

  window.SnakeBonDTodayProgram = { STORAGE_KEY, MAX_ITEMS, add, clear, dayKey, move, read, remove, replace, setAllDone, toggleDone };
})();
