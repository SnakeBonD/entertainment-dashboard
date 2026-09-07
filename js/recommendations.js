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

  function chooseFirst({ time, energy, company }) {
    if (time === "moins de 30 min") return "podcast";
    if (company === "en famille" || company === "avec des amis") return "movie";
    if (energy === "élevée") return "game";
    if (time === "30 à 60 min") return "youtube";
    if (energy === "faible") return "doc";
    return "movie";
  }

  function buildSuggestions({
    values,
    recommendations,
    platforms,
    metadata,
    preferences,
    isFavorite,
  }) {
    const recommendation = recommendations[values.mood];
    if (!recommendation) return [];

    const first = chooseFirst(values);
    const order = [first, ...Object.keys(labels).filter((type) => type !== first)];
    const contextCategories = globalThis.SnakeBonDPersonalization.contextCategories(values);

    return order.map((type, index) => {
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
        isFirst: index === 0,
      };
    });
  }

  function createResultCard(suggestion) {
    const { type, label: typeLabel, prompt, match, isFirst } = suggestion;
    const card = document.createElement("article");
    card.className = `recommendation-card${isFirst ? " is-first" : ""}`;

    const label = document.createElement("span");
    label.className = "recommendation-label";
    label.textContent = isFirst ? `À lancer · ${typeLabel}` : typeLabel;

    const title = document.createElement("h3");
    title.textContent = match?.platform.name ?? labels[type];

    const text = document.createElement("p");
    text.textContent = prompt;

    const why = document.createElement("p");
    why.className = "recommendation-why";
    why.textContent = match?.reasons?.join(" · ") ?? "Source gratuite et légale";

    card.append(label, title, text, why);

    if (match) {
      const link = document.createElement("a");
      link.className = "external-link recommendation-link";
      link.href = match.platform.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Ouvrir ${match.platform.name} ↗`;
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
        preferences: options.getPreferences(),
        isFavorite: options.isFavorite,
      });
      if (!suggestions.length) return;

      results.replaceChildren(...suggestions.map(createResultCard));
      results.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  globalThis.SnakeBonDRecommendations = {
    buildSuggestions,
    categoriesByType,
    chooseFirst,
    init,
  };
})();
