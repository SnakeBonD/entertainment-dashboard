(() => {
  "use strict";

  const accessLabels = {
    free: "100 % gratuit",
    ad_supported: "Gratuit avec pub",
    freemium: "Freemium",
    public_service: "Service public",
    public_domain: "Domaine public",
    open_source: "Libre",
  };

  const accountLabels = {
    none: "Sans compte",
    optional: "Compte facultatif",
    required: "Compte obligatoire",
  };

  const languageLabels = {
    fr: "FR",
    en: "EN",
    de: "DE",
    es: "ES",
    it: "IT",
    pl: "PL",
    pt: "PT",
    ro: "RO",
    multi: "Multilingue",
  };

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .trim();

  const metadataKey = (category, platformName) => `${category}::${platformName}`;

  function getMetadata(metadata, category, platform) {
    return {
      access: "free",
      account: "none",
      ads: false,
      languages: ["fr"],
      tags: [],
      france: true,
      lastVerified: metadata?.lastVerified ?? "",
      ...(metadata?.platforms?.[metadataKey(category, platform.name)] ?? {}),
    };
  }

  function searchableText(category, platform, meta) {
    return normalize([
      category,
      platform.name,
      platform.best,
      platform.premium,
      accessLabels[meta.access],
      accountLabels[meta.account],
      ...(meta.tags ?? []),
    ].join(" "));
  }

  function matches({ category, platform, meta, filters, isFavorite = false }) {
    if (filters.category !== "Tous" && category !== filters.category) return false;
    if (filters.favoritesOnly && !isFavorite) return false;
    if (filters.access !== "all" && meta.access !== filters.access) return false;
    if (filters.account !== "all" && meta.account !== filters.account) return false;
    if (filters.ads === "yes" && meta.ads !== true) return false;
    if (filters.ads === "no" && meta.ads !== false) return false;
    if (filters.language === "multi" && (meta.languages?.length ?? 0) < 2) return false;
    if (
      !["all", "multi"].includes(filters.language) &&
      !meta.languages?.includes(filters.language)
    ) return false;
    if (filters.search && !searchableText(category, platform, meta).includes(normalize(filters.search))) {
      return false;
    }
    return true;
  }

  function sortPlatforms(platforms, sort) {
    if (sort === "name") {
      return [...platforms].sort((a, b) => a.platform.name.localeCompare(b.platform.name, "fr"));
    }
    if (sort === "verified") {
      return [...platforms].sort((a, b) =>
        String(b.meta.lastVerified).localeCompare(String(a.meta.lastVerified)),
      );
    }
    return platforms;
  }

  function formatVerifiedDate(value) {
    if (!value) return "date inconnue";
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function activeFilterCount(filters) {
    return [
      filters.category !== "Tous",
      filters.favoritesOnly,
      Boolean(filters.search),
      filters.access !== "all",
      filters.account !== "all",
      filters.ads !== "all",
      filters.language !== "all",
      filters.sort !== "recommended",
    ].filter(Boolean).length;
  }

  globalThis.SnakeBonDCatalog = {
    accessLabels,
    accountLabels,
    activeFilterCount,
    formatVerifiedDate,
    getMetadata,
    languageLabels,
    matches,
    metadataKey,
    normalize,
    sortPlatforms,
  };
})();
