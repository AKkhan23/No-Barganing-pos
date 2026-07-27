import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import "@/index.css";
import App from "@/App";
import i18n from "@/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>,
);

// Register SW for offline caching — auto-updates without user action
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });

  const registerSW = () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});
  };

  window.addEventListener("load", registerSW);
  // Check for SW updates periodically
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then((r) => r?.update());
  }, 300_000);
  // Also check when user returns to the tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      navigator.serviceWorker.getRegistration().then((r) => r?.update());
    }
  });
}
