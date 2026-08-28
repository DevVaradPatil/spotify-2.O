"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "spotify2o-recent-searches";
const MAX_ENTRIES = 6;

/**
 * Recent search terms, per browser.
 *
 * localStorage rather than the database on purpose: this is a convenience for
 * one device, not account data worth a table, an RLS policy and a round trip.
 *
 * Every access is wrapped — localStorage throws outright in private mode and
 * in some embedded webviews, and a search page that crashes because it could
 * not remember a previous query would be a poor trade.
 */
const read = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const EMPTY: string[] = [];

// A tiny external store, so useSyncExternalStore can read it without a
// setState-in-effect and without a hydration mismatch: the server snapshot is
// always empty, and the client re-reads after hydration.
let snapshot: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => {
  if (!hydrated) {
    hydrated = true;
    snapshot = read();
  }
  return snapshot;
};

/** The server has no localStorage, so it always renders an empty list. */
const getServerSnapshot = () => EMPTY;

const write = (next: string[]) => {
  snapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the list simply will not survive a reload.
  }
  emit();
};

const useRecentSearches = () => {
  const searches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remember = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;

    write(
      [
        trimmed,
        ...getSnapshot().filter((t) => t.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_ENTRIES)
    );
  }, []);

  const clear = useCallback(() => write(EMPTY), []);

  return { searches, remember, clear };
};

export default useRecentSearches;
