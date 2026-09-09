(() => {
  "use strict";

  const statusLabels = {
    fresh: "À jour",
    warning: "À surveiller",
    unavailable: "En attente",
  };

  function hoursSince(value, now = new Date()) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
  }

  function formatRelativeHours(hours) {
    if (hours === null) return "Aucun contrôle confirmé";
    if (hours < 1) return "Contrôlé il y a moins d’une heure";
    if (hours < 24) return `Contrôlé il y a ${Math.floor(hours)} h`;
    const days = Math.floor(hours / 24);
    return `Contrôlé il y a ${days} jour${days > 1 ? "s" : ""}`;
  }

  function evaluateSource(source, now = new Date()) {
    const hours = hoursSince(source?.lastSuccessfulCheck, now);
    const threshold = Number(source?.warningAfterHours);
    const state = hours === null
      ? "unavailable"
      : hours > threshold
        ? "warning"
        : "fresh";

    return {
      ...source,
      state,
      statusLabel: statusLabels[state],
      relativeLabel: formatRelativeHours(hours),
      itemLabel: `${source?.itemCount ?? 0} élément${source?.itemCount === 1 ? "" : "s"}`,
    };
  }

  function summarize(document, now = new Date()) {
    const sources = (document?.sources ?? []).map((source) => evaluateSource(source, now));
    return {
      sources,
      fresh: sources.filter((source) => source.state === "fresh").length,
      warning: sources.filter((source) => source.state === "warning").length,
      unavailable: sources.filter((source) => source.state === "unavailable").length,
    };
  }

  window.SnakeBonDSourceHealth = { evaluateSource, summarize };
})();
