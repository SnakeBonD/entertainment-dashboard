(() => {
  "use strict";

  const productId = "-//SnakeBonD//Entertainment Dashboard//FR";

  function escapeText(value) {
    return String(value ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  }

  function formatUtc(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function foldLine(line) {
    const parts = [];
    let current = "";
    for (const character of line) {
      const candidate = current + character;
      const limit = parts.length ? 74 : 75;
      if (new TextEncoder().encode(candidate).length > limit && current) {
        parts.push(current);
        current = character;
      } else {
        current = candidate;
      }
    }
    parts.push(current);
    return parts.join("\r\n ");
  }

  function eventLines(item, now) {
    const start = new Date(item.expiryDate);
    if (!item.id || !Number.isFinite(start.getTime())) return [];
    const end = new Date(start.getTime() + (30 * 60 * 1000));
    const uid = `${String(item.id).replace(/[^a-z0-9._-]/gi, "-")}@entertainment.snakebond.net`;
    const action = item.provider === "epic-games-store" ? "Récupérer" : "Voir";
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatUtc(now)}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeText(`Date limite · ${item.title}`)}`,
      `DESCRIPTION:${escapeText(`${action} sur ${item.platform} avant la fin de disponibilité.`)}`,
      `URL:${item.url}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ];
  }

  function build(items, { name = "Échéances SnakeBonD", now = new Date() } = {}) {
    const unique = [...new Map((items ?? [])
      .filter((item) => item?.expiryDate && Date.parse(item.expiryDate) >= now.getTime())
      .map((item) => [item.id, item])).values()]
      .sort((a, b) => Date.parse(a.expiryDate) - Date.parse(b.expiryDate));
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:${productId}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeText(name)}`,
      ...unique.flatMap((item) => eventLines(item, now)),
      "END:VCALENDAR",
    ];
    return `${lines.map(foldLine).join("\r\n")}\r\n`;
  }

  function download(items, filename = "agenda-snakebond.ics", options = {}) {
    const content = build(items, options);
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  globalThis.SnakeBonDCalendar = { build, download, escapeText, foldLine, formatUtc };
})();
