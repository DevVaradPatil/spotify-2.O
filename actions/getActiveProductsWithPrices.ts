import { unstable_cache } from "next/cache";

import { ProductWithPrice } from "@/types";
import { createPublicClient } from "@/libs/supabase/public";
import { CACHE_TAGS, CACHE_TTL_SECONDS } from "@/libs/cacheTags";

/**
 * The pricing table is global and changes only when Stripe sends a
 * product/price webhook, which is exactly when it is invalidated. It was
 * previously re-fetched in the root layout on every single navigation.
 */
const getActiveProductsWithPrices = unstable_cache(
  async (): Promise<ProductWithPrice[]> => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("products")
      .select("*, prices(*)")
      .eq("active", true)
      .eq("prices.active", true)
      .order("metadata->index")
      .order("unit_amount", { referencedTable: "prices" });

    if (error) {
      console.error("[getActiveProductsWithPrices]", error.message);
      return [];
    }

    return (data as unknown as ProductWithPrice[]) ?? [];
  },
  ["active-products"],
  { tags: [CACHE_TAGS.products], revalidate: CACHE_TTL_SECONDS }
);

export default getActiveProductsWithPrices;
