(() => {
  "use strict";

  const storageKey = "snakebondEntertainmentPreferencesV3";

  function defaults() {
    return {
      version: 1,
      categories: [],
      priorities: {
        french: false,
        noAds: false,
        noAccount: false,
      },
    };
  }

  function sanitize(value, allowedCategories = []) {
    const fallback = defaults();
    if (!value || typeof value !== "object") return fallback;

    const allowed = new Set(allowedCategories);
    const categories = Array.isArray(value.categories)
      ? [...new Set(value.categories.filter((category) => allowed.has(category)))]
      : [];

    return {
      version: 1,
      categories,
      priorities: {
        french: value.priorities?.french === true,
        noAds: value.priorities?.noAds === true,
        noAccount: value.priorities?.noAccount === true,
      },
    };
  }

  function read(allowedCategories = []) {
    try {
      return sanitize(JSON.parse(localStorage.getItem(storageKey) ?? "null"), allowedCategories);
    } catch {
      return defaults();
    }
  }

  function write(value, allowedCategories = []) {
    const preferences = sanitize(value, allowedCategories);

    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      return false;
    }

    window.dispatchEvent(
      new CustomEvent("snakebond:preferences-changed", { detail: { preferences } }),
    );
    return true;
  }

  function reset(allowedCategories = []) {
    const preferences = sanitize(defaults(), allowedCategories);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      return false;
    }

    window.dispatchEvent(
      new CustomEvent("snakebond:preferences-changed", { detail: { preferences } }),
    );
    return true;
  }

  function count(preferences) {
    return (preferences?.categories?.length ?? 0)
      + Object.values(preferences?.priorities ?? {}).filter(Boolean).length;
  }

  globalThis.SnakeBonDPreferences = {
    count,
    defaults,
    read,
    reset,
    sanitize,
    storageKey,
    write,
  };
})();
