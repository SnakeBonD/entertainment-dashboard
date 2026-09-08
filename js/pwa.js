(() => {
  "use strict";

  const installButtons = [...document.querySelectorAll("[data-install-app]")];
  const connectionStatus = document.getElementById("connection-status");
  const installState = document.getElementById("app-install-state");
  const offlineState = document.getElementById("app-offline-state");
  const updateState = document.getElementById("app-update-state");
  const updateButton = document.getElementById("check-app-update");
  const actionStatus = document.getElementById("app-action-status");
  let installPrompt = null;
  let registration = null;
  let refreshing = false;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function setInstallButtonsVisible(visible) {
    installButtons.forEach((button) => {
      button.hidden = !visible;
    });
  }

  function updateConnectionStatus(message = "") {
    if (!connectionStatus) return;

    const online = navigator.onLine;
    connectionStatus.classList.toggle("is-offline", !online);
    const label = connectionStatus.querySelector("strong");
    if (label) {
      label.textContent = message || (online ? "En ligne · connexion disponible" : "Hors ligne · copie enregistrée");
    }
  }

  function updateDiagnostics() {
    if (installState) {
      installState.textContent = isStandalone()
        ? "Installée sur cet appareil"
        : installPrompt
          ? "Prête à être installée"
          : "Guide manuel disponible";
    }
    if (offlineState) {
      offlineState.textContent = "serviceWorker" in navigator
        ? navigator.onLine
          ? "Cache prêt après la première visite"
          : "Application ouverte hors ligne"
        : "Non pris en charge par ce navigateur";
    }
    if (updateState) {
      updateState.textContent = registration ? "Surveillance active" : "Initialisation…";
    }
  }

  async function installApplication() {
    if (!installPrompt) {
      if (actionStatus) {
        actionStatus.textContent = isStandalone()
          ? "L’application est déjà installée."
          : "Utilise le guide ci-dessous si ton navigateur ne propose pas l’installation.";
      }
      return;
    }

    installButtons.forEach((button) => {
      button.disabled = true;
    });
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (actionStatus) {
        actionStatus.textContent = choice.outcome === "accepted"
          ? "Installation acceptée."
          : "Installation annulée.";
      }
      installPrompt = null;
      setInstallButtonsVisible(false);
    } finally {
      installButtons.forEach((button) => {
        button.disabled = false;
      });
      updateDiagnostics();
    }
  }

  async function checkForUpdate() {
    if (!registration) {
      if (actionStatus) actionStatus.textContent = "Le service de mise à jour n’est pas encore prêt.";
      return;
    }

    if (updateButton) updateButton.disabled = true;
    if (updateState) updateState.textContent = "Recherche en cours…";
    if (actionStatus) actionStatus.textContent = "Vérification de la version publiée…";
    try {
      await registration.update();
      if (registration.waiting) {
        if (updateState) updateState.textContent = "Mise à jour prête";
        if (actionStatus) actionStatus.textContent = "Nouvelle version détectée, activation en cours…";
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        if (updateState) updateState.textContent = "Application à jour";
        if (actionStatus) actionStatus.textContent = "Aucune nouvelle version détectée.";
      }
    } catch (error) {
      console.warn("PWA : vérification de mise à jour impossible", error);
      if (updateState) updateState.textContent = "Vérification impossible";
      if (actionStatus) actionStatus.textContent = "La mise à jour n’a pas pu être vérifiée. Réessaie en ligne.";
    } finally {
      if (updateButton) updateButton.disabled = false;
    }
  }

  window.addEventListener("online", () => {
    updateConnectionStatus();
    updateDiagnostics();
  });
  window.addEventListener("offline", () => {
    updateConnectionStatus();
    updateDiagnostics();
  });
  updateConnectionStatus();
  updateDiagnostics();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    setInstallButtonsVisible(!isStandalone());
    updateDiagnostics();
  });

  installButtons.forEach((button) => {
    button.addEventListener("click", installApplication);
  });
  updateButton?.addEventListener("click", checkForUpdate);

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    setInstallButtonsVisible(false);
    updateConnectionStatus("Application installée");
    if (actionStatus) actionStatus.textContent = "Installation terminée.";
    updateDiagnostics();
  });

  if (!("serviceWorker" in navigator)) {
    updateConnectionStatus(navigator.onLine ? "En ligne · mode hors ligne indisponible" : "Hors ligne");
    if (updateState) updateState.textContent = "Non pris en charge";
    if (updateButton) updateButton.disabled = true;
    return;
  }

  window.addEventListener("load", async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      updateConnectionStatus("Mise à jour appliquée…");
      window.location.reload();
    });

    try {
      registration = await navigator.serviceWorker.register("service-worker.js", {
        scope: "./",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
      updateDiagnostics();
      await registration.update();
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      console.warn("PWA : service worker indisponible", error);
      updateConnectionStatus(navigator.onLine ? "En ligne · cache indisponible" : "Hors ligne");
      if (offlineState) offlineState.textContent = "Cache indisponible";
      if (updateState) updateState.textContent = "Service indisponible";
      if (updateButton) updateButton.disabled = true;
    }
  });
})();
