-- Phase 2 · adds the missing `paused` subscription status
--
-- NOT YET APPLIED. Safe to paste into the Supabase SQL editor.
--
-- Stripe's Subscription.Status union includes `paused`, which this enum does
-- not. Until now a @ts-ignore in libs/supabaseAdmin.ts hid the gap; the
-- webhook would have thrown at runtime the first time Stripe sent that value
-- and the subscription row would silently fail to update.
--
-- `paused` is genuinely reachable here: checkout is created with a 7-day
-- trial, and a trial that ends with no payment method on file can transition
-- to paused rather than canceled depending on the subscription's
-- trial_settings.
--
-- No transaction block on purpose. ALTER TYPE ... ADD VALUE cannot be used in
-- the same transaction that later references the new value, and wrapping it
-- adds no safety here.

alter type public.subscription_status add value if not exists 'paused';
