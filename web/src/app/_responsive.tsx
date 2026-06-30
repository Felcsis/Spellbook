"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-biztos media-query hook (useSyncExternalStore-ral).
 * Szerveren mindig `false`-t ad vissza (asztali alapértelmezés),
 * majd hidratálás után a tényleges értékre vált.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", callback);
      return () => m.removeEventListener("change", callback);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** ≤ 640px — telefon */
export const useIsMobile = () => useMediaQuery("(max-width: 640px)");

/** ≤ 1024px — tablet és kisebb */
export const useIsTablet = () => useMediaQuery("(max-width: 1024px)");
