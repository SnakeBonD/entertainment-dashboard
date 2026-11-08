(() => {
  "use strict";

  const STORAGE_KEY = "snakebond-today-program-v1";
  const COMPOSER_STORAGE_KEY = "snakebond-today-program-composer-v1";
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
      durationMinutes: Number.isInteger(item.durationMinutes) && item.durationMinutes > 0 ? item.durationMinutes : null,
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

  const planIds = (items) => Array.isArray(items) ? [...new Set(items.map((item) => typeof item === "string" ? item : item?.id).filter((id) => typeof id === "string" && id))] : [];
  const planSignature = (items) => planIds(items).sort().join("|");

  function readComposeHistory(context, storage = window.localStorage, now = new Date()) {
    if (typeof context !== "string" || !context) return [];
    try {
      const value = JSON.parse(storage.getItem(COMPOSER_STORAGE_KEY) || "null");
      if (value?.date !== dayKey(now) || value?.context !== context || !Array.isArray(value?.plans)) return [];
      const seen = new Set();
      return value.plans.flatMap((plan) => {
        const ids = planIds(plan);
        const signature = planSignature(ids);
        if (!ids.length || seen.has(signature)) return [];
        seen.add(signature);
        return [ids];
      }).slice(-100);
    } catch { return []; }
  }

  function replaceComposeHistory(context, plans, storage = window.localStorage, now = new Date()) {
    if (typeof context !== "string" || !context || !Array.isArray(plans)) return false;
    const seen = new Set();
    const safePlans = plans.flatMap((plan) => {
      const ids = planIds(plan);
      const signature = planSignature(ids);
      if (!ids.length || seen.has(signature)) return [];
      seen.add(signature);
      return [ids];
    }).slice(-100);
    try {
      storage.setItem(COMPOSER_STORAGE_KEY, JSON.stringify({ date: dayKey(now), context, plans: safePlans }));
      return true;
    } catch { return false; }
  }

  function knownDuration(items) {
    if (!Array.isArray(items)) return { minutes: 0, remainingMinutes: 0, knownItems: 0, totalItems: 0 };
    return items.reduce((total, item) => {
      total.totalItems += 1;
      if (Number.isInteger(item?.durationMinutes) && item.durationMinutes > 0) {
        total.minutes += item.durationMinutes;
        if (item.done !== true) total.remainingMinutes += item.durationMinutes;
        total.knownItems += 1;
      }
      return total;
    }, { minutes: 0, remainingMinutes: 0, knownItems: 0, totalItems: 0 });
  }

  function formatDuration(minutes) {
    if (!Number.isInteger(minutes) || minutes < 0) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours} h${remainder ? ` ${remainder} min` : ""}`;
  }

  function knownEndTime(remainingMinutes, now = new Date()) {
    const start = new Date(now);
    if (!Number.isInteger(remainingMinutes) || remainingMinutes < 0 || Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + remainingMinutes * 60_000);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  function compose(items, budgetMinutes, excludedPlans = []) {
    if (!Array.isArray(items) || !Number.isInteger(budgetMinutes) || budgetMinutes <= 0) return [];
    const exclusions = Array.isArray(excludedPlans) && excludedPlans.every((entry) => typeof entry === "string") ? [excludedPlans] : Array.isArray(excludedPlans) ? excludedPlans : [];
    const excludedSignatures = new Set(exclusions.map(planSignature).filter(Boolean));
    const seen = new Set();
    const candidates = items.flatMap((item, index) => {
      const safe = sanitizeItem(item);
      if (!safe || seen.has(safe.id) || !safe.durationMinutes || safe.durationMinutes > budgetMinutes) return [];
      seen.add(safe.id);
      return [{ item: safe, index }];
    });
    let best = { items: [], indices: [], minutes: 0 };
    const hasHigherPriority = (indices) => {
      const length = Math.max(indices.length, best.indices.length);
      for (let index = 0; index < length; index += 1) {
        const next = indices[index] ?? Infinity;
        const current = best.indices[index] ?? Infinity;
        if (next !== current) return next < current;
      }
      return false;
    };
    const visit = (start, selected, indices, minutes) => {
      const isExcluded = excludedSignatures.has(planSignature(selected));
      if (selected.length && !isExcluded && (minutes > best.minutes || (minutes === best.minutes && hasHigherPriority(indices)))) {
        best = { items: [...selected], indices: [...indices], minutes };
      }
      if (selected.length === MAX_ITEMS) return;
      for (let index = start; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const nextMinutes = minutes + candidate.item.durationMinutes;
        if (nextMinutes <= budgetMinutes) visit(index + 1, [...selected, candidate.item], [...indices, candidate.index], nextMinutes);
      }
    };
    visit(0, [], [], 0);
    return best.items;
  }

  window.SnakeBonDTodayProgram = { STORAGE_KEY, COMPOSER_STORAGE_KEY, MAX_ITEMS, add, clear, compose, dayKey, formatDuration, knownDuration, knownEndTime, move, read, readComposeHistory, remove, replace, replaceComposeHistory, setAllDone, toggleDone };
})();
