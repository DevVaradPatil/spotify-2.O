import type Stripe from "stripe";

import type { Tables } from "@/types_db";

/**
 * Derived from the generated database types rather than hand-maintained.
 *
 * The old hand-written versions contradicted the schema: Song.id was `string`
 * where the column is int8, and Playlist.song_ids was `string[]` where the
 * column is int8[]. AddToPlaylist compared the two with indexOf across that
 * mismatch, which is why adding or removing a song from a playlist could
 * silently do nothing.
 */
export type Song = Tables<"songs">;
export type Playlist = Tables<"playlists">;

export interface Product {
  id: string;
  active?: boolean;
  name?: string;
  description?: string;
  image?: string;
  metadata?: Stripe.Metadata;
}

export interface Price {
  id: string;
  product_id?: string;
  active?: boolean;
  description?: string;
  unit_amount?: number;
  currency?: string;
  type?: Stripe.Price.Type;
  interval?: Stripe.Price.Recurring.Interval;
  interval_count?: number;
  trial_period_days?: number | null;
  metadata?: Stripe.Metadata;
  products?: Product;
}

export interface Customer {
  id: string;
  stripe_customer_id?: string;
}

/**
 * The users table has no first_name / last_name columns — those were declared
 * here and never existed in the schema, so the cast in useUser silently
 * asserted fields that could never arrive.
 */
export type UserDetails = Omit<
  Tables<"users">,
  "billing_address" | "payment_method"
> & {
  billing_address?: Stripe.Address | null;
  payment_method?: Stripe.PaymentMethod[Stripe.PaymentMethod.Type] | null;
};

export interface ProductWithPrice extends Product {
  prices?: Price[];
}

export interface Subscription {
  id: string;
  user_id: string;
  status?: Stripe.Subscription.Status;
  metadata?: Stripe.Metadata;
  price_id?: string;
  quantity?: number;
  cancel_at_period_end?: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at?: string;
  cancel_at?: string;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  prices?: Price;
}
