(() => {
  "use strict";

  const state = {
    platforms: {},
    schedule: {},
    activeCategory: "Tous",
    favoritesOnly: false,
    search: "",
  };

  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");

  async function fetchJson(path) {
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) {
      throw new Error(`Chargement impossible : ${path} (${response.status})`);
    }
    return response.json();
  }

  function openTab(tabId, updateHash = true) {
    const target = document.getElementById(tabId);
    if (!target || !target.classList.contains("page")) return;

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("is-active", page.id === tabId);
    });
    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.tab === tabId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    if (updateHash && window.location.hash !== `#${tabId}`) {
      history.replaceState(null, "", `#${tabId}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupNavigation() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => openTab(button.dataset.tab));
    });
    document.querySelectorAll("[data-open-tab]").forEach((button) => {
      button.addEventListener("click", () => openTab(button.dataset.openTab));
    });

    window.addEventListener("hashchange", () => {
      const tabId = window.location.hash.slice(1);
      if (tabId) openTab(tabId, false);
    });

    const initialTab = window.location.hash.slice(1);
    if (initialTab) openTab(initialTab, false);
  }

  function updateFavoriteCount() {
    const count = window.SnakeBonDFavorites?.count() ?? 0;
    const target = document.getElementById("favorite-count");
    if (target) target.textContent = String(count);
  }

  function createFavoriteButton(category, platform) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "favorite-button";
    button.setAttribute("aria-label", `Ajouter ${platform.name} aux favoris`);

    const updateState = () => {
      const active = window.SnakeBonDFavorites?.has(category, platform.name) ?? false;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute(
        "aria-label",
        active
          ? `Retirer ${platform.name} des favoris`
          : `Ajouter ${platform.name} aux favoris`,
      );
      button.textContent = active ? "★" : "☆";
    };

    button.addEventListener("click", () => {
      window.SnakeBonDFavorites?.toggle(category, platform.name);
      updateState();
      updateFavoriteCount();
      if (state.favoritesOnly) renderPlatforms();
    });

    updateState();
    return button;
  }

  function createPlatformCard(category, platform) {
    const card = document.createElement("article");
    card.className = "platform-card";

    const title = document.createElement("h3");
    title.textContent = platform.name;

    const description = document.createElement("p");
    description.textContent = platform.best;

    const premium = document.createElement("p");
    premium.className = "premium-tip";
    premium.textContent = platform.premium;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const link = document.createElement("a");
    link.className = "external-link";
    link.href = platform.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ouvrir ↗";

    actions.append(link, createFavoriteButton(category, platform));
    card.append(title, description, premium, actions);
    return card;
  }

  function platformMatches(category, platform) {
    if (state.activeCategory !== "Tous" && category !== state.activeCategory) return false;
    if (
      state.favoritesOnly &&
      !window.SnakeBonDFavorites?.has(category, platform.name)
    ) return false;

    if (!state.search) return true;
    const haystack = normalize(
      `${category} ${platform.name} ${platform.best} ${platform.premium}`,
    );
    return haystack.includes(normalize(state.search));
  }

  function renderPlatforms() {
    const container = document.getElementById("platform-container");
    const countTarget = document.getElementById("platform-result-count");
    const blocks = [];
    let visibleCount = 0;

    Object.entries(state.platforms).forEach(([category, platforms]) => {
      const shown = platforms.filter((platform) => platformMatches(category, platform));
      if (!shown.length) return;

      visibleCount += shown.length;
      const block = document.createElement("section");
      block.className = "category-block";

      const heading = document.createElement("h2");
      heading.className = "category-title";
      heading.append(document.createTextNode(category));

      const count = document.createElement("span");
      count.className = "category-count";
      count.textContent = String(shown.length);
      heading.append(count);

      const grid = document.createElement("div");
      grid.className = "platform-grid";
      grid.append(...shown.map((platform) => createPlatformCard(category, platform)));
      block.append(heading, grid);
      blocks.push(block);
    });

    if (!blocks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const title = document.createElement("h2");
      title.textContent = "Aucun résultat";
      const text = document.createElement("p");
      text.textContent = "Essaie une autre recherche ou réinitialise les filtres.";
      empty.append(title, text);
      blocks.push(empty);
    }

    container.replaceChildren(...blocks);
    countTarget.textContent = `${visibleCount} plateforme${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""}`;
  }

  function renderCategoryFilters() {
    const container = document.getElementById("category-filters");
    const categories = ["Tous", ...Object.keys(state.platforms)];

    const buttons = categories.map((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-button";
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === state.activeCategory));
      button.addEventListener("click", () => {
        state.activeCategory = category;
        renderCategoryFilters();
        renderPlatforms();
      });
      return button;
    });

    container.replaceChildren(...buttons);
  }

  function setupPlatformControls() {
    const search = document.getElementById("platform-search");
    const favoritesOnly = document.getElementById("favorites-only");

    search.addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderPlatforms();
    });

    favoritesOnly.addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;
      favoritesOnly.setAttribute("aria-pressed", String(state.favoritesOnly));
      favoritesOnly.textContent = state.favoritesOnly ? "Tous les contenus" : "Mes favoris";
      renderPlatforms();
    });

    window.addEventListener("snakebond:favorites-changed", updateFavoriteCount);
  }

  function renderMusic() {
    const container = document.getElementById("music-schedule");
    const sourceContainer = document.getElementById("music-sources");
    const music = state.schedule.music ?? [];
    const sources = state.schedule.musicSources ?? [];

    const cards = music.map((day) => {
      const card = document.createElement("article");
      card.className = "schedule-card";
      const dayName = document.createElement("span");
      dayName.className = "day";
      dayName.textContent = day.day;
      card.append(dayName);

      ["focus", "gym", "chill", "night"].forEach((mood) => {
        const item = document.createElement("div");
        item.className = "mood-item";
        const label = document.createElement("strong");
        label.textContent = mood === "night" ? "Nuit" : mood;
        const value = document.createElement("span");
        value.textContent = day[mood];
        item.append(label, value);
        card.append(item);
      });

      return card;
    });

    const sourceCards = sources.map((source) => {
      const card = document.createElement("article");
      card.className = "content-card";
      const title = document.createElement("h3");
      title.textContent = source.name;
      const text = document.createElement("p");
      text.textContent = source.tip;
      card.append(title, text);
      return card;
    });

    container.replaceChildren(...cards);
    sourceContainer.replaceChildren(...sourceCards);
  }

  function renderTableRows(targetId, rows, keys) {
    const target = document.getElementById(targetId);
    const elements = rows.map((row) => {
      const tr = document.createElement("tr");
      keys.forEach((key) => {
        const td = document.createElement("td");
        td.textContent = row[key];
        tr.append(td);
      });
      return tr;
    });
    target.replaceChildren(...elements);
  }

  function renderWeekend() {
    const container = document.getElementById("weekend-schedule");
    const cards = (state.schedule.weekend ?? []).map((slot) => {
      const card = document.createElement("article");
      card.className = "content-card";
      const title = document.createElement("h3");
      title.textContent = slot.title;
      card.append(title);
      slot.activities.forEach((activity) => {
        const item = document.createElement("p");
        item.textContent = activity;
        card.append(item);
      });
      return card;
    });
    container.replaceChildren(...cards);
  }

  function renderSchedules() {
    renderMusic();
    renderWeekend();
    renderTableRows("youtube-schedule", state.schedule.youtube ?? [], [
      "day", "category", "source", "search", "duration",
    ]);
    renderTableRows("podcast-schedule", state.schedule.podcasts ?? [], [
      "day", "type", "search", "goal",
    ]);
    renderTableRows("learning-schedule", state.schedule.learning ?? [], [
      "day", "duration", "source", "topic", "result",
    ]);
  }

  function showLoadError(error) {
    console.error(error);
    openTab("error-page");
  }

  async function init() {
    setupNavigation();

    try {
      const [platforms, schedule, recommendations] = await Promise.all([
        fetchJson("data/platforms.json"),
        fetchJson("data/schedule.json"),
        fetchJson("data/recommendations.json"),
      ]);

      state.platforms = platforms;
      state.schedule = schedule;

      document.getElementById("platform-count").textContent = String(
        Object.values(platforms).flat().length,
      );
      updateFavoriteCount();
      renderCategoryFilters();
      renderPlatforms();
      renderSchedules();
      setupPlatformControls();
      window.SnakeBonDRecommendations?.init(recommendations);
    } catch (error) {
      showLoadError(error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
