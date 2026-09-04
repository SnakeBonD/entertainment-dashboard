(() => {
  "use strict";

  const labels = {
    movie: "Film",
    youtube: "YouTube",
    podcast: "Podcast",
    game: "Jeu",
    doc: "Documentaire",
  };

  function chooseFirst({ time, energy, company }) {
    if (time === "moins de 30 min") return "podcast";
    if (company === "en famille" || company === "avec des amis") return "movie";
    if (energy === "élevée") return "game";
    if (time === "30 à 60 min") return "youtube";
    if (energy === "faible") return "doc";
    return "movie";
  }

  function createResultCard(type, content, isFirst) {
    const card = document.createElement("article");
    card.className = `recommendation-card${isFirst ? " is-first" : ""}`;

    const label = document.createElement("span");
    label.className = "recommendation-label";
    label.textContent = isFirst ? `À lancer · ${labels[type]}` : labels[type];

    const text = document.createElement("p");
    text.textContent = content;

    card.append(label, text);
    return card;
  }

  function init(recommendations) {
    const form = document.getElementById("chooser-form");
    const results = document.getElementById("recommendation-results");

    if (!form || !results) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const values = Object.fromEntries(new FormData(form));
      const recommendation = recommendations[values.mood];
      if (!recommendation) return;

      const first = chooseFirst(values);
      const order = [first, ...Object.keys(labels).filter((type) => type !== first)];
      results.replaceChildren(
        ...order.map((type) => createResultCard(type, recommendation[type], type === first)),
      );

      results.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  window.SnakeBonDRecommendations = { init };
})();
