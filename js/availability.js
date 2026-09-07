(() => {
  "use strict";

  const dayMs = 24 * 60 * 60 * 1000;
  const warningDays = 7;

  const statusLabels = {
    active: "Disponible",
    expiring_soon: "Bientôt indisponible",
    expiring_today: "Dernier jour",
    expired: "Expiré",
    permanent: "Sans date de fin",
  };

  const typeLabels = {
    movie: "Film",
    tv: "Série TV",
    game: "Jeu",
    documentary: "Documentaire",
  };

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .trim();

  function timestamp(value) {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function daysUntil(expiryDate, now = new Date()) {
    const expiry = timestamp(expiryDate);
    if (expiry === null) return null;
    return Math.ceil((expiry - now.getTime()) / dayMs);
  }

  function getStatus(item, now = new Date()) {
    if (!item.expiryDate) return "permanent";
    const expiry = timestamp(item.expiryDate);
    if (expiry !== null && expiry <= now.getTime()) return "expired";
    const days = daysUntil(item.expiryDate, now);
    if (days === null) return "active";
    if (days <= 1) return "expiring_today";
    if (days <= warningDays) return "expiring_soon";
    return "active";
  }

  function formatDate(value) {
    const parsed = timestamp(value);
    if (parsed === null) return "date inconnue";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    }).format(new Date(parsed));
  }

  function formatExpiry(item, now = new Date()) {
    const status = getStatus(item, now);
    const days = daysUntil(item.expiryDate, now);
    if (status === "permanent") return "Pas de date de fin annoncée";
    if (status === "expired") return `Expiré le ${formatDate(item.expiryDate)}`;
    if (status === "expiring_today") return "Expire dans moins de 24 h";
    if (status === "expiring_soon") {
      return `Expire dans ${days} jour${days > 1 ? "s" : ""}`;
    }
    return `Disponible jusqu’au ${formatDate(item.expiryDate)}`;
  }

  function verifiedItems(catalogue) {
    return (catalogue?.items ?? []).filter((item) => item.verified === true && item.country === "FR");
  }

  function matchesStatus(status, selectedStatus) {
    if (selectedStatus === "all") return status !== "expired";
    if (selectedStatus === "expiring") {
      return status === "expiring_today" || status === "expiring_soon";
    }
    return status === selectedStatus;
  }

  function filterItems(items, { search = "", status = "all", type = "all" }, now = new Date()) {
    const query = normalize(search);
    return items.filter((item) => {
      const itemStatus = getStatus(item, now);
      if (!matchesStatus(itemStatus, status)) return false;
      if (type !== "all" && item.type !== type) return false;
      if (!query) return true;
      return normalize([item.title, item.platform, typeLabels[item.type], item.description].join(" "))
        .includes(query);
    });
  }

  function sortByExpiry(items) {
    return [...items].sort((a, b) => {
      const aTime = timestamp(a.expiryDate) ?? Number.POSITIVE_INFINITY;
      const bTime = timestamp(b.expiryDate) ?? Number.POSITIVE_INFINITY;
      return aTime - bTime || a.title.localeCompare(b.title, "fr");
    });
  }

  function summarize(items, now = new Date()) {
    const summary = { active: 0, expiring: 0, permanent: 0, expired: 0, total: items.length };
    items.forEach((item) => {
      const status = getStatus(item, now);
      if (status === "expiring_today" || status === "expiring_soon") summary.expiring += 1;
      else if (status === "permanent") summary.permanent += 1;
      else if (status === "expired") summary.expired += 1;
      else summary.active += 1;
    });
    return summary;
  }

  function archiveExpired(catalogue, archive, now = new Date()) {
    const moved = [];
    const active = [];
    const archivedIds = new Set((archive?.items ?? []).map((item) => item.id));
    const archivedAt = now.toISOString();

    (catalogue?.items ?? []).forEach((item) => {
      if (getStatus(item, now) !== "expired") {
        active.push(item);
        return;
      }

      if (!archivedIds.has(item.id)) {
        moved.push({ ...item, archivedAt, archiveReason: "expired" });
        archivedIds.add(item.id);
      }
    });

    return {
      moved,
      catalogue: {
        ...catalogue,
        lastUpdated: moved.length ? archivedAt : catalogue?.lastUpdated ?? null,
        items: active,
      },
      archive: {
        ...archive,
        lastUpdated: moved.length ? archivedAt : archive?.lastUpdated ?? null,
        items: [...(archive?.items ?? []), ...moved],
      },
    };
  }

  globalThis.SnakeBonDAvailability = {
    archiveExpired,
    daysUntil,
    filterItems,
    formatDate,
    formatExpiry,
    getStatus,
    sortByExpiry,
    statusLabels,
    summarize,
    typeLabels,
    verifiedItems,
    warningDays,
  };
})();
