(() => {
  "use strict";
  const time = (value) => new Date(value).getTime();
  function build({ catalogue = { items: [] }, podcasts = { items: [] }, now = new Date(), isTracked = () => false, isFavorite = () => false }) {
    const nowTime = now.getTime();
    const contents = (catalogue.items ?? []).filter((item) => item.verified && (!item.expiryDate || time(item.expiryDate) >= nowTime)).map((item) => {
      const days = item.expiryDate ? Math.ceil((time(item.expiryDate) - nowTime) / 86400000) : Infinity;
      const addedDays = item.addedDate ? Math.floor((nowTime - time(item.addedDate)) / 86400000) : Infinity;
      const tracked = isTracked(item.id) || isFavorite(item.platform);
      const group = item.provider === "epic-games" ? "epic" : days <= 7 ? "lastChance" : addedDays <= 7 ? "new" : null;
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
  window.SnakeBonDToday = { build, filter };
})();
