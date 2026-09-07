(() => {
  "use strict";

  const state = {
    platforms: {},
    metadata: {},
    schedule: {},
    activeCategory: "Tous",
    favoritesOnly: false,
    search: "",
    access: "all",
    account: "all",
    ads: "all",
    language: "all",
    sort: "recommended",
    preferences: null,
    catalogue: { items: [] },
    archive: { items: [] },
    availabilitySearch: "",
    availabilityStatus: "all",
    availabilityType: "all",
  };

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

    document.body.classList.remove("nav-open");
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");

    if (updateHash && window.location.hash !== `#${tabId}`) {
      history.replaceState(null, "", `#${tabId}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupNavigation() {
    const menuToggle = document.getElementById("menu-toggle");

    menuToggle?.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

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

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !document.body.classList.contains("nav-open")) return;
      document.body.classList.remove("nav-open");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.focus();
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
      if (state.favoritesOnly) renderPlatforms();
    });

    updateState();
    return button;
  }

  function createBadge(text, variant = "") {
    const badge = document.createElement("span");
    badge.className = `meta-badge${variant ? ` meta-badge-${variant}` : ""}`;
    badge.textContent = text;
    return badge;
  }

  function createPlatformCard(category, platform, meta) {
    const card = document.createElement("article");
    card.className = "platform-card";

    const heading = document.createElement("div");
    heading.className = "platform-card-heading";

    const title = document.createElement("h3");
    title.textContent = platform.name;
    heading.append(title, createFavoriteButton(category, platform));

    const badges = document.createElement("div");
    badges.className = "platform-meta";
    badges.append(
      createBadge(window.SnakeBonDCatalog.accessLabels[meta.access] ?? "Gratuit", meta.access),
      createBadge(meta.ads ? "Avec pub" : "Sans pub", meta.ads ? "ads" : "no-ads"),
      createBadge(window.SnakeBonDCatalog.accountLabels[meta.account] ?? "Compte inconnu"),
    );

    const languages = meta.languages ?? [];
    const languageText = languages.length > 3
      ? `${languages.slice(0, 2).map((code) => window.SnakeBonDCatalog.languageLabels[code] ?? code.toUpperCase()).join(" · ")} +${languages.length - 2}`
      : languages.map((code) => window.SnakeBonDCatalog.languageLabels[code] ?? code.toUpperCase()).join(" · ");
    badges.append(createBadge(languageText || "Langue non précisée", "language"));

    const description = document.createElement("p");
    description.className = "platform-description";
    description.textContent = platform.best;

    const descriptionLabel = document.createElement("span");
    descriptionLabel.className = "card-label";
    descriptionLabel.textContent = "Idéal pour";
    description.prepend(descriptionLabel);

    const premium = document.createElement("p");
    premium.className = "premium-tip";
    premium.textContent = platform.premium;

    const premiumLabel = document.createElement("span");
    premiumLabel.className = "card-label";
    premiumLabel.textContent = "Astuce premium";
    premium.prepend(premiumLabel);

    const verified = document.createElement("p");
    verified.className = "verified-date";
    verified.textContent = `Vérifié le ${window.SnakeBonDCatalog.formatVerifiedDate(meta.lastVerified)}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const link = document.createElement("a");
    link.className = "external-link";
    link.href = platform.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ouvrir ↗";

    actions.append(link, verified);
    card.append(heading, badges, description, premium, actions);
    return card;
  }

  function platformMatches(category, platform) {
    const meta = window.SnakeBonDCatalog.getMetadata(state.metadata, category, platform);
    return window.SnakeBonDCatalog.matches({
      category,
      platform,
      meta,
      filters: {
        category: state.activeCategory,
        favoritesOnly: state.favoritesOnly,
        search: state.search,
        access: state.access,
        account: state.account,
        ads: state.ads,
        language: state.language,
      },
      isFavorite: window.SnakeBonDFavorites?.has(category, platform.name) ?? false,
    });
  }

  function updateFilterState() {
    const filters = {
      category: state.activeCategory,
      favoritesOnly: state.favoritesOnly,
      search: state.search,
      access: state.access,
      account: state.account,
      ads: state.ads,
      language: state.language,
      sort: state.sort,
    };
    const count = window.SnakeBonDCatalog.activeFilterCount(filters);
    const countTarget = document.getElementById("active-filter-count");
    const resetButton = document.getElementById("reset-filters");
    if (countTarget) {
      countTarget.textContent = count
        ? `${count} filtre${count > 1 ? "s" : ""} actif${count > 1 ? "s" : ""}`
        : "Aucun actif";
    }
    if (resetButton) resetButton.disabled = count === 0;
  }

  function renderPlatforms() {
    const container = document.getElementById("platform-container");
    const countTarget = document.getElementById("platform-result-count");
    const blocks = [];
    let visibleCount = 0;

    Object.entries(state.platforms).forEach(([category, platforms]) => {
      const shown = platforms
        .filter((platform) => platformMatches(category, platform))
        .map((platform) => ({
          platform,
          meta: window.SnakeBonDCatalog.getMetadata(state.metadata, category, platform),
        }));
      if (!shown.length) return;

      const sorted = window.SnakeBonDCatalog.sortPlatforms(shown, state.sort);

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
      grid.append(...sorted.map(({ platform, meta }) => createPlatformCard(category, platform, meta)));
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
    updateFilterState();
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
    const resetButton = document.getElementById("reset-filters");
    const advancedFilters = document.getElementById("advanced-filters");
    const selectBindings = {
      "access-filter": "access",
      "account-filter": "account",
      "ads-filter": "ads",
      "language-filter": "language",
      "sort-filter": "sort",
    };

    if (window.matchMedia("(max-width: 760px)").matches) {
      advancedFilters?.removeAttribute("open");
    }

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

    Object.entries(selectBindings).forEach(([id, stateKey]) => {
      document.getElementById(id)?.addEventListener("change", (event) => {
        state[stateKey] = event.target.value;
        renderPlatforms();
      });
    });

    resetButton?.addEventListener("click", () => {
      state.activeCategory = "Tous";
      state.favoritesOnly = false;
      state.search = "";
      state.access = "all";
      state.account = "all";
      state.ads = "all";
      state.language = "all";
      state.sort = "recommended";

      search.value = "";
      favoritesOnly.setAttribute("aria-pressed", "false");
      favoritesOnly.textContent = "Mes favoris";
      Object.entries(selectBindings).forEach(([id, stateKey]) => {
        const select = document.getElementById(id);
        if (select) select.value = state[stateKey];
      });
      renderCategoryFilters();
      renderPlatforms();
    });

    window.addEventListener("snakebond:favorites-changed", handleFavoritesChanged);
  }

  function renderPreferenceForm() {
    const form = document.getElementById("preferences-form");
    const categoryContainer = document.getElementById("preference-categories");
    const preferences = state.preferences ?? window.SnakeBonDPreferences.defaults();

    const categoryOptions = Object.keys(state.platforms).map((category) => {
      const label = document.createElement("label");
      label.className = "preference-chip";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "categories";
      input.value = category;
      input.checked = preferences.categories.includes(category);

      const text = document.createElement("span");
      text.textContent = category;
      label.append(input, text);
      return label;
    });

    categoryContainer.replaceChildren(...categoryOptions);
    ["french", "noAds", "noAccount"].forEach((priority) => {
      const input = form.elements.namedItem(priority);
      if (input) input.checked = preferences.priorities[priority];
    });
  }

  function createPersonalRecommendationCard(entry) {
    const card = document.createElement("article");
    card.className = "personal-recommendation-card";

    const top = document.createElement("div");
    top.className = "personal-card-top";

    const category = document.createElement("span");
    category.className = "personal-category";
    category.textContent = entry.category;

    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = `${entry.score} %`;
    score.setAttribute("aria-label", `${entry.score} pour cent de correspondance`);
    top.append(category, score);

    const heading = document.createElement("div");
    heading.className = "platform-card-heading";
    const title = document.createElement("h3");
    title.textContent = entry.platform.name;
    heading.append(title, createFavoriteButton(entry.category, entry.platform));

    const description = document.createElement("p");
    description.textContent = entry.platform.best;

    const reasons = document.createElement("ul");
    reasons.className = "reason-list";
    entry.reasons.forEach((reason) => {
      const item = document.createElement("li");
      item.textContent = reason;
      reasons.append(item);
    });

    const link = document.createElement("a");
    link.className = "external-link recommendation-link";
    link.href = entry.platform.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Ouvrir ${entry.platform.name} ↗`;

    card.append(top, heading, description, reasons, link);
    return card;
  }

  function renderPersonalRecommendations() {
    const container = document.getElementById("personal-recommendations");
    const intro = document.getElementById("personal-recommendation-intro");
    const summary = document.getElementById("profile-summary");
    const preferenceCount = window.SnakeBonDPreferences.count(state.preferences);
    const favoriteCount = window.SnakeBonDFavorites?.count() ?? 0;
    const matches = window.SnakeBonDPersonalization.rankPlatforms({
      platforms: state.platforms,
      metadata: state.metadata,
      preferences: state.preferences,
      isFavorite: (category, name) => window.SnakeBonDFavorites?.has(category, name) ?? false,
      limit: 6,
    });

    summary.textContent = preferenceCount
      ? `${preferenceCount} préférence${preferenceCount > 1 ? "s" : ""} active${preferenceCount > 1 ? "s" : ""}`
      : "Profil à configurer";
    intro.textContent = preferenceCount || favoriteCount
      ? "Classement calculé à partir de ton profil et de tes favoris, avec les raisons affichées sur chaque proposition."
      : "Sélection de départ. Configure ton profil ou ajoute des favoris pour obtenir un classement personnel.";
    container.replaceChildren(...matches.map(createPersonalRecommendationCard));
  }

  function renderPersonalFavorites() {
    const container = document.getElementById("personal-favorites");
    const favorites = window.SnakeBonDPersonalization
      .flattenPlatforms(state.platforms, state.metadata)
      .filter(({ category, platform }) =>
        window.SnakeBonDFavorites?.has(category, platform.name),
      );

    if (favorites.length) {
      container.replaceChildren(
        ...favorites.map(({ category, platform, meta }) =>
          createPlatformCard(category, platform, meta),
        ),
      );
      return;
    }

    const empty = document.createElement("div");
    empty.className = "personal-empty";
    const title = document.createElement("h3");
    title.textContent = "Aucun favori pour le moment";
    const text = document.createElement("p");
    text.textContent = "Ajoute une étoile depuis le catalogue pour retrouver la plateforme ici.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button compact-button";
    button.textContent = "Explorer les plateformes";
    button.addEventListener("click", () => openTab("plateformes"));
    empty.append(title, text, button);
    container.replaceChildren(empty);
  }

  function renderPersonalArea() {
    renderPersonalRecommendations();
    renderPersonalFavorites();
  }

  function handleFavoritesChanged() {
    updateFavoriteCount();
    renderPersonalArea();
  }

  function setupPreferences() {
    const form = document.getElementById("preferences-form");
    const resetButton = document.getElementById("reset-preferences");
    const status = document.getElementById("preference-status");
    const categories = Object.keys(state.platforms);

    renderPreferenceForm();
    renderPersonalArea();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(form);
      const preferences = {
        version: 1,
        categories: values.getAll("categories"),
        priorities: {
          french: values.has("french"),
          noAds: values.has("noAds"),
          noAccount: values.has("noAccount"),
        },
      };

      if (!window.SnakeBonDPreferences.write(preferences, categories)) {
        status.textContent = "L’enregistrement local n’est pas disponible dans ce navigateur.";
        status.classList.add("is-error");
        return;
      }

      state.preferences = window.SnakeBonDPreferences.sanitize(preferences, categories);
      status.textContent = "Profil enregistré sur cet appareil.";
      status.classList.remove("is-error");
      renderPersonalArea();
    });

    resetButton.addEventListener("click", () => {
      if (!window.SnakeBonDPreferences.reset(categories)) {
        status.textContent = "Les préférences locales n’ont pas pu être effacées.";
        status.classList.add("is-error");
        return;
      }

      state.preferences = window.SnakeBonDPreferences.defaults();
      renderPreferenceForm();
      renderPersonalArea();
      status.textContent = "Profil effacé. Tes favoris sont conservés.";
      status.classList.remove("is-error");
    });
  }

  function createAvailabilityCard(item, now, archived = false) {
    const availability = window.SnakeBonDAvailability;
    const status = archived ? "expired" : availability.getStatus(item, now);
    const card = document.createElement("article");
    card.className = `availability-card availability-card-${status}`;

    const meta = document.createElement("div");
    meta.className = "availability-card-meta";
    const type = document.createElement("span");
    type.className = "availability-type";
    type.textContent = availability.typeLabels[item.type] ?? item.type;
    const statusBadge = document.createElement("span");
    statusBadge.className = `availability-status availability-status-${status}`;
    statusBadge.textContent = archived ? "Archivé" : availability.statusLabels[status];
    meta.append(type, statusBadge);

    const title = document.createElement("h3");
    title.textContent = item.title;

    const platform = document.createElement("p");
    platform.className = "availability-platform";
    platform.textContent = item.platform;

    if (item.description) {
      const description = document.createElement("p");
      description.className = "availability-description";
      description.textContent = item.description;
      card.append(meta, title, platform, description);
    } else {
      card.append(meta, title, platform);
    }

    const timing = document.createElement("p");
    timing.className = "availability-timing";
    timing.textContent = archived
      ? `Archivé le ${availability.formatDate(item.archivedAt)}`
      : availability.formatExpiry(item, now);

    const verification = document.createElement("p");
    verification.className = "availability-verification";
    verification.textContent = `Vérifié le ${availability.formatDate(item.verifiedAt)}`;

    const actions = document.createElement("div");
    actions.className = "availability-actions";

    if (!archived) {
      const link = document.createElement("a");
      link.className = "external-link";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Ouvrir ↗";
      actions.append(link);
    }

    if (item.sourceUrl) {
      const source = document.createElement("a");
      source.className = "source-link";
      source.href = item.sourceUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Source officielle ↗";
      actions.append(source);
    }

    card.append(timing, verification, actions);
    return card;
  }

  function createAvailabilityEmpty(filtered) {
    const empty = document.createElement("div");
    empty.className = "availability-empty";
    const title = document.createElement("h2");
    title.textContent = filtered ? "Aucun résultat" : "Aucun contenu daté vérifié";
    const text = document.createElement("p");
    text.textContent = filtered
      ? "Modifie les filtres pour afficher d’autres disponibilités."
      : "Le catalogue permanent reste accessible. Les premiers contenus apparaîtront ici dès que leurs dates auront été confirmées.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button compact-button";
    button.textContent = filtered ? "Réinitialiser les filtres" : "Explorer les plateformes";
    button.addEventListener("click", () => {
      if (filtered) {
        state.availabilitySearch = "";
        state.availabilityStatus = "all";
        state.availabilityType = "all";
        document.getElementById("availability-search").value = "";
        document.getElementById("availability-status-filter").value = "all";
        document.getElementById("availability-type-filter").value = "all";
        renderAvailability();
      } else {
        openTab("plateformes");
      }
    });
    empty.append(title, text, button);
    return empty;
  }

  function renderAvailability() {
    const availability = window.SnakeBonDAvailability;
    const now = new Date();
    const verified = availability.verifiedItems(state.catalogue);
    const summary = availability.summarize(verified, now);
    const filtered = availability.sortByExpiry(
      availability.filterItems(verified, {
        search: state.availabilitySearch,
        status: state.availabilityStatus,
        type: state.availabilityType,
      }, now),
    );
    const archiveItems = availability.sortByExpiry(state.archive.items ?? []);
    const hasFilters = Boolean(state.availabilitySearch)
      || state.availabilityStatus !== "all"
      || state.availabilityType !== "all";

    document.getElementById("expiring-count").textContent = String(summary.expiring);
    document.getElementById("availability-active-count").textContent = String(
      summary.active + summary.expiring + summary.permanent,
    );
    document.getElementById("availability-soon-count").textContent = String(summary.expiring);
    document.getElementById("availability-archive-count").textContent = String(archiveItems.length);
    document.getElementById("archive-summary-count").textContent =
      `${archiveItems.length} contenu${archiveItems.length > 1 ? "s" : ""}`;
    document.getElementById("availability-last-updated").textContent = state.catalogue.lastUpdated
      ? `Mis à jour le ${availability.formatDate(state.catalogue.lastUpdated)}`
      : "En attente du premier contenu vérifié";
    document.getElementById("availability-result-count").textContent =
      `${filtered.length} contenu${filtered.length > 1 ? "s" : ""} affiché${filtered.length > 1 ? "s" : ""}`;

    const container = document.getElementById("availability-container");
    container.replaceChildren(
      ...(filtered.length
        ? filtered.map((item) => createAvailabilityCard(item, now))
        : [createAvailabilityEmpty(hasFilters)]),
    );

    const archiveContainer = document.getElementById("archive-container");
    archiveContainer.replaceChildren(
      ...(archiveItems.length
        ? archiveItems.map((item) => createAvailabilityCard(item, now, true))
        : [createAvailabilityEmpty(false)]),
    );
  }

  function setupAvailabilityControls() {
    const search = document.getElementById("availability-search");
    const status = document.getElementById("availability-status-filter");
    const type = document.getElementById("availability-type-filter");

    search.addEventListener("input", (event) => {
      state.availabilitySearch = event.target.value.trim();
      renderAvailability();
    });
    status.addEventListener("change", (event) => {
      state.availabilityStatus = event.target.value;
      renderAvailability();
    });
    type.addEventListener("change", (event) => {
      state.availabilityType = event.target.value;
      renderAvailability();
    });

    renderAvailability();
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
      const [platforms, metadata, schedule, recommendations, catalogue, archive] = await Promise.all([
        fetchJson("data/platforms.json"),
        fetchJson("data/platform-metadata.json"),
        fetchJson("data/schedule.json"),
        fetchJson("data/recommendations.json"),
        fetchJson("data/catalogue.json"),
        fetchJson("data/archive.json"),
      ]);

      state.platforms = platforms;
      state.metadata = metadata;
      state.schedule = schedule;
      state.preferences = window.SnakeBonDPreferences.read(Object.keys(platforms));
      state.catalogue = catalogue;
      state.archive = archive;

      document.getElementById("platform-count").textContent = String(
        Object.values(platforms).flat().length,
      );
      updateFavoriteCount();
      renderCategoryFilters();
      renderPlatforms();
      renderSchedules();
      setupPlatformControls();
      setupAvailabilityControls();
      setupPreferences();
      window.SnakeBonDRecommendations?.init(recommendations, {
        platforms,
        metadata,
        getPreferences: () => state.preferences,
        isFavorite: (category, name) => window.SnakeBonDFavorites?.has(category, name) ?? false,
      });
    } catch (error) {
      showLoadError(error);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
