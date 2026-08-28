/**
 * Cache tags shared between the readers that populate them and the writers
 * that invalidate them, so a typo cannot silently break invalidation.
 */
export const CACHE_TAGS = {
  songs: "songs",
  products: "products",
} as const;

/** How long cached public data may be stale before a background refresh. */
export const CACHE_TTL_SECONDS = 300;
