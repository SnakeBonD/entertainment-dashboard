(() => {
  "use strict";

  const schema = "snakebond-entertainment-backup";
  const version = 1;
  const maxFileSize = 1024 * 1024;

  function build({ favorites, preferences, watchlist }, now = new Date()) {
    return {
      schema,
      version,
      exportedAt: now.toISOString(),
      data: { favorites, preferences, watchlist },
    };
  }

  function parse(text, { allowedCategories = [] } = {}) {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error("Ce fichier ne contient pas un JSON valide.");
    }

    if (value?.schema !== schema || value?.version !== version || !value.data) {
      throw new Error("Ce fichier n’est pas une sauvegarde SnakeBonD compatible.");
    }

    return {
      schema,
      version,
      exportedAt: Number.isFinite(Date.parse(value.exportedAt)) ? value.exportedAt : null,
      data: {
        favorites: globalThis.SnakeBonDFavorites.sanitize(value.data.favorites),
        preferences: globalThis.SnakeBonDPreferences.sanitize(value.data.preferences, allowedCategories),
        watchlist: globalThis.SnakeBonDWatchlist.sanitize(value.data.watchlist),
      },
    };
  }

  function summarize(snapshot) {
    return {
      favorites: snapshot.data.favorites.length,
      preferences: globalThis.SnakeBonDPreferences.count(snapshot.data.preferences),
      watchlist: Object.keys(snapshot.data.watchlist).length,
    };
  }

  function apply(snapshot, { allowedCategories = [] } = {}) {
    const previous = {
      favorites: globalThis.SnakeBonDFavorites.entries(),
      preferences: globalThis.SnakeBonDPreferences.read(allowedCategories),
      watchlist: globalThis.SnakeBonDWatchlist.read(),
    };

    const completed = [];
    try {
      if (!globalThis.SnakeBonDFavorites.replace(snapshot.data.favorites)) throw new Error();
      completed.push("favorites");
      if (!globalThis.SnakeBonDPreferences.write(snapshot.data.preferences, allowedCategories)) throw new Error();
      completed.push("preferences");
      if (!globalThis.SnakeBonDWatchlist.replace(snapshot.data.watchlist)) throw new Error();
      return true;
    } catch {
      if (completed.includes("favorites")) globalThis.SnakeBonDFavorites.replace(previous.favorites);
      if (completed.includes("preferences")) globalThis.SnakeBonDPreferences.write(previous.preferences, allowedCategories);
      globalThis.SnakeBonDWatchlist.replace(previous.watchlist);
      return false;
    }
  }

  function download(snapshot) {
    const content = JSON.stringify(snapshot, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `snakebond-entertainment-backup-${snapshot.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function init({ allowedCategories = [] } = {}) {
    const exportButton = document.getElementById("export-local-data");
    const importButton = document.getElementById("import-local-data");
    const fileInput = document.getElementById("backup-file");
    const dialog = document.getElementById("backup-dialog");
    const preview = document.getElementById("backup-preview");
    const confirm = document.getElementById("confirm-backup-import");
    const cancel = document.getElementById("cancel-backup-import");
    const status = document.getElementById("backup-status");
    let pending = null;

    if (!exportButton || !importButton || !fileInput || !dialog || !preview || !confirm || !cancel || !status) return;

    exportButton.addEventListener("click", () => {
      download(build({
        favorites: globalThis.SnakeBonDFavorites.entries(),
        preferences: globalThis.SnakeBonDPreferences.read(allowedCategories),
        watchlist: globalThis.SnakeBonDWatchlist.read(),
      }));
      status.textContent = "Sauvegarde téléchargée. Conserve ce fichier dans un endroit sûr.";
    });

    importButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const [file] = fileInput.files;
      fileInput.value = "";
      if (!file) return;
      if (file.size > maxFileSize) {
        status.textContent = "Fichier refusé : la sauvegarde dépasse 1 Mo.";
        return;
      }
      try {
        pending = parse(await file.text(), { allowedCategories });
        const counts = summarize(pending);
        preview.textContent = `${counts.favorites} favori${counts.favorites > 1 ? "s" : ""}, ${counts.preferences} préférence${counts.preferences > 1 ? "s" : ""} et ${counts.watchlist} contenu${counts.watchlist > 1 ? "s" : ""} suivi${counts.watchlist > 1 ? "s" : ""} seront restaurés.`;
        dialog.showModal();
      } catch (error) {
        pending = null;
        status.textContent = error.message;
      }
    });

    cancel.addEventListener("click", () => {
      pending = null;
      dialog.close();
    });
    confirm.addEventListener("click", () => {
      if (!pending) return;
      if (!apply(pending, { allowedCategories })) {
        status.textContent = "La restauration a échoué. Les données précédentes ont été conservées.";
        dialog.close();
        return;
      }
      dialog.close();
      window.location.reload();
    });
  }

  globalThis.SnakeBonDBackup = { apply, build, init, maxFileSize, parse, schema, summarize, version };
})();
