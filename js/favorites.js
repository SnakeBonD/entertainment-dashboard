(() => {
  "use strict";

  const storageKey = "snakebondEntertainmentFavorites";

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(value) ? new Set(value.filter((item) => typeof item === "string")) : new Set();
    } catch {
      return new Set();
    }
  }

  function write(favorites) {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...favorites]));
    } catch {
      return false;
    }

    window.dispatchEvent(
      new CustomEvent("snakebond:favorites-changed", {
        detail: { favorites: [...favorites] },
      }),
    );
    return true;
  }

  function makeId(category, name) {
    return `${category}::${name}`;
  }

  function sanitize(entries) {
    return Array.isArray(entries)
      ? [...new Set(entries.filter((item) => typeof item === "string" && item.includes("::")))]
      : [];
  }

  function replace(entries) {
    return write(new Set(sanitize(entries)));
  }

  function has(category, name) {
    return read().has(makeId(category, name));
  }

  function toggle(category, name) {
    const favorites = read();
    const id = makeId(category, name);

    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }

    write(favorites);
    return favorites.has(id);
  }

  window.SnakeBonDFavorites = {
    count: () => read().size,
    entries: () => [...read()],
    has,
    hasPlatform: (name) => [...read()].some((id) => id.endsWith(`::${name}`)),
    makeId,
    replace,
    sanitize,
    storageKey,
    toggle,
  };
})();
