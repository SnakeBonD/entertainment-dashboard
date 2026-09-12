(() => {
  "use strict";

  function normalize(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function buildIndex({ platforms = {}, catalogue = { items: [] }, radioFrance = { items: [] } }) {
    const platformEntries = Object.entries(platforms).flatMap(([category, items]) => items.map((item) => ({
      id: `platform-${category}-${item.name}`,
      kind: "platform",
      kindLabel: "Plateforme",
      title: item.name,
      subtitle: category,
      description: item.best,
      url: item.url,
      searchText: normalize([item.name, category, item.best, item.premium].join(" ")),
    })));
    const contentEntries = (catalogue.items ?? []).map((item) => ({
      id: `content-${item.id}`,
      kind: "content",
      kindLabel: "Contenu",
      title: item.title,
      subtitle: item.platform,
      description: item.description ?? "",
      url: item.url,
      searchText: normalize([item.title, item.platform, item.type, item.description].join(" ")),
    }));
    const podcastEntries = (radioFrance.items ?? []).map((item) => ({
      id: `podcast-${item.id}`,
      kind: "podcast",
      kindLabel: "Podcast",
      title: item.title,
      subtitle: `${item.station} · ${item.podcastTitle}`,
      description: item.description,
      url: item.url,
      searchText: normalize([item.title, item.station, item.podcastTitle, item.description].join(" ")),
    }));
    return [...platformEntries, ...contentEntries, ...podcastEntries];
  }

  function search(index, query, kind = "all") {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.filter((item) => (kind === "all" || item.kind === kind)
      && terms.every((term) => item.searchText.includes(term)));
  }

  window.SnakeBonDGlobalSearch = { normalize, buildIndex, search };
})();
