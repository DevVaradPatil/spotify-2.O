"use client";

import { useEffect } from "react";

import { logger } from "@/libs/logger";

/**
 * Registers the service worker in production only.
 *
 * Registering in development fights the dev server: a worker that intercepts
 * navigations and caches build output makes hot reload behave unpredictably
 * and hides changes behind a stale cache.
 */
const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // A failed registration costs offline support, nothing more, so it is
      // logged rather than surfaced to the user.
      logger.warn(
        "Service worker registration failed",
        {
          scope: "service-worker",
        },
        error
      );
    });
  }, []);

  return null;
};

export default ServiceWorkerRegistrar;
