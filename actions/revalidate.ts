"use server";

import { updateTag } from "next/cache";

import { CACHE_TAGS } from "@/libs/cacheTags";

/**
 * Cache invalidation, callable from client components.
 *
 * A cache is only as correct as its invalidation: getSongs is shared across
 * every visitor, so an upload has to bust it or the new track would not appear
 * until the TTL expired.
 *
 * `updateTag` rather than `revalidateTag` on purpose — it is the Next 16 API
 * with read-your-own-writes semantics, so the uploader sees their own song on
 * the very next render instead of racing a background refresh.
 */
export const revalidateSongs = async () => {
  updateTag(CACHE_TAGS.songs);
};

export const revalidateProducts = async () => {
  updateTag(CACHE_TAGS.products);
};
