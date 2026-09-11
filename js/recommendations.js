(() => {
  "use strict";

  const labels = {
    movie: "Film ou série",
    youtube: "YouTube",
    podcast: "Podcast",
    game: "Jeu",
    doc: "Documentaire",
  };

  const categoriesByType = {
    movie: ["Films", "Séries TV"],
    youtube: ["Apprentissage", "Documentaires"],
    podcast: ["Podcasts"],
    game: ["Jeux"],
    doc: ["Documentaires"],
  };

  const catalogueTypes = {
    movie: ["movie", "tv"],
    doc: ["documentary"],
    game: ["game"],
  };

  const timeRanges = {
    "moins de 30 min": [0, 30],
    "30 à 60 min": [30, 60],
    "1 à 2 h": [60, 120],
    "plus de 2 h": [120, Number.POSITIVE_INFINITY],
  };

  function chooseFirst({ time, energy, company, format = "surprise" }) {
    if (format !== "surprise" && labels[format]) return format;
    if (time === "moins de 30 min") return "podcast";
    if (company === "en famille" || company === "avec des amis") return "movie";
    if (energy === "élevée") return "game";
    if (time === "30 à 60 min") return "youtube";
    if (energy === "faible") return "doc";
    return "movie";
  }

  function durationMinutes(label) {
    const match = String(label ?? "").match(/(\d+)\s*min/i);
    return match ? Number(match[1]) : null;
  }

  function durationFits(label, time) {
    const minutes = durationMinutes(label);
    const range = timeRanges[time];
    if (minutes === null || !range) return false;
    return minutes >= range[0] && minutes <= range[1];
  }

  function categoryForItem(item) {
    return {
      movie: "Films",
      tv: "Séries TV",
      documentary: "Documentaires",
      game: "Jeux",
    }[item.type] ?? "";
  }

  function contentReasons(item, values, options, now) {
    const reasons = [];
    const days = globalThis.SnakeBonDAvailability.daysUntil(item.expiryDate, now);
    const status = options.getWatchlistStatus?.(item.id);

    if (durationFits(item.durationLabel, values.time)) reasons.push(`Durée adaptée · ${item.durationLabel}`);
    if (values.format !== "surprise") reasons.push(`Format demandé · ${labels[values.format]}`);
    if (days !== null && days >= 0 && days <= 30) {
      reasons.push(days <= 1 ? "À voir aujourd’hui" : `À voir dans les ${days} prochains jours`);
    }
    if (status === "discover") reasons.push("Déjà dans ta liste");
    if (status === "progress") reasons.push("Déjà commencé");
    if (options.isFavorite?.(categoryForItem(item), item.platform)) {
      reasons.push("Plateforme favorite");
    }
    return [...new Set(reasons.length ? reasons : ["Contenu daté et vérifié"])]
      .slice(0, 3);
  }

  function scoreContent(item, type, values, options, now) {
    let score = 40;
    const reasons = contentReasons(item, values, options, now);
    const days = globalThis.SnakeBonDAvailability.daysUntil(item.expiryDate, now);
    const status = options.getWatchlistStatus?.(item.id);

    if (durationFits(item.durationLabel, values.time)) score += 22;
    if (values.format === type) score += 26;
    if (days !== null && days >= 0) {
      if (values.priority === "deadline") score += days <= 30 ? 45 - days : Math.max(0, 15 - Math.floor(days / 30));
      else if (days <= 7) score += 18;
      else if (days <= 30) score += 10;
    }
    if (status === "discover" || status === "progress") score += values.priority === "personal" ? 40 : 18;
    if (options.isFavorite?.(categoryForItem(item), item.platform)) {
      score += values.priority === "personal" ? 30 : 12;
    }
    return { score, reasons };
  }

  function bestContent(type, values, options, now = new Date()) {
    const allowedTypes = catalogueTypes[type];
    if (!allowedTypes || !globalThis.SnakeBonDAvailability || !options.catalogue?.items?.length) return null;
    return globalThis.SnakeBonDAvailability.verifiedItems(options.catalogue)
      .filter((item) => allowedTypes.includes(item.type))
      .filter((item) => globalThis.SnakeBonDAvailability.getStatus(item, now) !== "expired")
      .map((item, order) => ({ item, order, ...scoreContent(item, type, values, options, now) }))
      .sort((a, b) => b.score - a.score || a.order - b.order)[0] ?? null;
  }

  function buildSuggestions({
    values,
    recommendations,
    platforms,
    metadata,
    preferences,
    isFavorite,
    catalogue = { items: [] },
    getWatchlistStatus = () => null,
    now = new Date(),
  }) {
    const recommendation = recommendations[values.mood];
    if (!recommendation) return [];

    const first = chooseFirst(values);
    const order = [first, ...Object.keys(labels).filter((type) => type !== first)];
    const contextCategories = globalThis.SnakeBonDPersonalization.contextCategories(values);

    return order.map((type, index) => {
      const content = bestContent(type, values, {
        catalogue,
        isFavorite,
        getWatchlistStatus,
      }, now);
      const [match] = globalThis.SnakeBonDPersonalization.rankPlatforms({
        platforms,
        metadata,
        preferences,
        isFavorite,
        limit: 1,
        allowedCategories: categoriesByType[type],
        contextCategories,
      });

      return {
        type,
        label: labels[type],
        prompt: recommendation[type],
        match,
        content,
        isFirst: index === 0,
      };
    });
  }

  function createResultCard(suggestion) {
    const { type, label: typeLabel, prompt, match, content, isFirst } = suggestion;
    const card = document.createElement("article");
    card.className = `recommendation-card${isFirst ? " is-first" : ""}`;

    const label = document.createElement("span");
    label.className = "recommendation-label";
    label.textContent = isFirst ? `À lancer · ${typeLabel}` : typeLabel;

    const title = document.createElement("h3");
    title.textContent = content?.item.title ?? match?.platform.name ?? labels[type];

    const text = document.createElement("p");
    text.textContent = content
      ? `${content.item.platform}${content.item.durationLabel ? ` · ${content.item.durationLabel}` : ""}`
      : prompt;

    const why = document.createElement("p");
    why.className = "recommendation-why";
    why.textContent = (content?.reasons?.length ? content.reasons : match?.reasons)?.join(" · ") ?? "Source gratuite et légale";

    card.append(label, title, text, why);

    const target = content?.item ?? match?.platform;
    if (target) {
      const link = document.createElement("a");
      link.className = "external-link recommendation-link";
      link.href = target.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = content ? `Voir sur ${content.item.platform} ↗` : `Ouvrir ${match.platform.name} ↗`;
      card.append(link);
    }

    return card;
  }

  function init(recommendations, options) {
    const form = document.getElementById("chooser-form");
    const results = document.getElementById("recommendation-results");

    if (!form || !results) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const values = Object.fromEntries(new FormData(form));
      const suggestions = buildSuggestions({
        values,
        recommendations,
        platforms: options.platforms,
        metadata: options.metadata,
        catalogue: options.catalogue,
        preferences: options.getPreferences(),
        isFavorite: options.isFavorite,
        getWatchlistStatus: options.getWatchlistStatus,
      });
      if (!suggestions.length) return;

      results.replaceChildren(...suggestions.map(createResultCard));
      results.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  globalThis.SnakeBonDRecommendations = {
    buildSuggestions,
    bestContent,
    categoryForItem,
    categoriesByType,
    chooseFirst,
    durationFits,
    init,
  };
})();
