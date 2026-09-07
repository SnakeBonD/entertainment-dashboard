(() => {
  "use strict";

  const preferredAccess = new Set(["free", "public_service", "public_domain", "open_source"]);

  function uniqueReasons(reasons) {
    return [...new Set(reasons)].slice(0, 3);
  }

  function scoreEntry({ entry, preferences, isFavorite = false, contextCategories = [] }) {
    const selectedCategories = preferences?.categories ?? [];
    const priorities = preferences?.priorities ?? {};
    const reasons = [];
    let score = 45;

    if (isFavorite) {
      score += 30;
      reasons.push("Déjà dans tes favoris");
    }

    if (selectedCategories.length) {
      if (selectedCategories.includes(entry.category)) {
        score += 24;
        reasons.push(`Univers ${entry.category.toLocaleLowerCase("fr")}`);
      } else {
        score -= 12;
      }
    }

    if (priorities.french) {
      if (entry.meta.languages?.includes("fr")) {
        score += 10;
        reasons.push("Disponible en français");
      } else {
        score -= 20;
      }
    }

    if (priorities.noAds) {
      if (entry.meta.ads === false) {
        score += 9;
        reasons.push("Sans publicité");
      } else {
        score -= 15;
      }
    }

    if (priorities.noAccount) {
      if (entry.meta.account === "none") {
        score += 10;
        reasons.push("Aucun compte nécessaire");
      } else if (entry.meta.account === "optional") {
        score += 4;
      } else {
        score -= 16;
      }
    }

    if (preferredAccess.has(entry.meta.access)) score += 4;

    if (contextCategories.includes(entry.category)) {
      score += 15;
      reasons.push("Adapté à ton choix du moment");
    }

    return {
      score: Math.max(1, Math.min(99, score)),
      reasons: uniqueReasons(reasons.length ? reasons : ["Source gratuite et légale"]),
    };
  }

  function flattenPlatforms(platforms, metadata) {
    let order = 0;
    return Object.entries(platforms ?? {}).flatMap(([category, items]) =>
      items.map((platform) => ({
        category,
        platform,
        meta: globalThis.SnakeBonDCatalog.getMetadata(metadata, category, platform),
        order: order++,
      })),
    );
  }

  function rankPlatforms({
    platforms,
    metadata,
    preferences,
    isFavorite = () => false,
    limit = 6,
    allowedCategories = null,
    contextCategories = [],
  }) {
    const allowed = allowedCategories ? new Set(allowedCategories) : null;

    return flattenPlatforms(platforms, metadata)
      .filter((entry) => !allowed || allowed.has(entry.category))
      .map((entry) => ({
        ...entry,
        ...scoreEntry({
          entry,
          preferences,
          isFavorite: isFavorite(entry.category, entry.platform.name),
          contextCategories,
        }),
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, limit);
  }

  function contextCategories({ time, energy, company }) {
    const categories = new Set();

    if (time === "moins de 30 min") {
      categories.add("Podcasts");
      categories.add("Musique");
      categories.add("Apprentissage");
    } else if (time === "30 à 60 min") {
      categories.add("Documentaires");
      categories.add("Apprentissage");
      categories.add("Podcasts");
    } else if (time === "1 à 2 h") {
      categories.add("Films");
      categories.add("Séries TV");
      categories.add("Documentaires");
    } else if (time === "plus de 2 h") {
      categories.add("Séries TV");
      categories.add("Jeux");
      categories.add("Livres");
    }

    if (energy === "faible") {
      categories.add("Musique");
      categories.add("Livres");
    } else if (energy === "élevée") {
      categories.add("Jeux");
      categories.add("Musique");
    }

    if (company === "en famille") {
      categories.add("Films");
      categories.add("Séries TV");
      categories.add("Jeux");
    } else if (company === "avec des amis") {
      categories.add("Jeux");
      categories.add("Films");
      categories.add("Musique");
    } else if (company === "en couple") {
      categories.add("Films");
      categories.add("Séries TV");
      categories.add("Musique");
    }

    return [...categories];
  }

  globalThis.SnakeBonDPersonalization = {
    contextCategories,
    flattenPlatforms,
    rankPlatforms,
    scoreEntry,
  };
})();
