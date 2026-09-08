(() => {
  "use strict";

  const installButton = document.getElementById("install-app");
  const connectionStatus = document.getElementById("connection-status");
  let installPrompt = null;

  function updateConnectionStatus(message = "") {
    if (!connectionStatus) return;

    const online = navigator.onLine;
    connectionStatus.classList.toggle("is-offline", !online);
    const label = connectionStatus.querySelector("strong");
    if (label) {
      label.textContent = message || (online ? "En ligne · données fraîches" : "Hors ligne · copie enregistrée");
    }
  }

  window.addEventListener("online", () => updateConnectionStatus());
  window.addEventListener("offline", () => updateConnectionStatus());
  updateConnectionStatus();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  installButton?.addEventListener("click", async () => {
    if (!installPrompt) return;

    installButton.disabled = true;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
    installButton.disabled = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    updateConnectionStatus("Application installée");
  });

  if (!("serviceWorker" in navigator)) {
    updateConnectionStatus(navigator.onLine ? "En ligne · mode hors ligne indisponible" : "Hors ligne");
    return;
  }

  window.addEventListener("load", async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      updateConnectionStatus("Mise à jour appliquée…");
      window.location.reload();
    });

    try {
      const registration = await navigator.serviceWorker.register("service-worker.js", {
        scope: "./",
        updateViaCache: "none",
      });
      await registration.update();
    } catch (error) {
      console.warn("PWA : service worker indisponible", error);
      updateConnectionStatus(navigator.onLine ? "En ligne · cache indisponible" : "Hors ligne");
    }
  });
})();
