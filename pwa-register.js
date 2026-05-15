if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/questionario/service-worker.js", {
        scope: "/questionario/"
      });
    } catch (error) {
      console.error("PWA service worker registration failed:", error);
    }
  });
}
