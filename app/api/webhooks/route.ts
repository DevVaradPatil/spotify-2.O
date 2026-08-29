import Stripe from "stripe";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/libs/cacheTags";
import { logger } from "@/libs/logger";

import { stripe } from "@/libs/stripe";
import {
  upsertProductRecord,
  upsertPriceRecord,
  manageSubscriptionStatusChange,
} from "@/libs/supabaseAdmin";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("Stripe-Signature");

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    logger.error("Signature verification failed", { scope: "stripe-webhook" }, err);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          await upsertProductRecord(event.data.object as Stripe.Product);
          // The pricing table is cached globally; this webhook is its only
          // writer, so it is also the only place that can invalidate it.
          revalidateTag(CACHE_TAGS.products, "max");
          break;
        case "price.created":
        case "price.updated":
          await upsertPriceRecord(event.data.object as Stripe.Price);
          revalidateTag(CACHE_TAGS.products, "max");
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            event.type === "customer.subscription.created"
          );
          break;
        case "checkout.session.completed":
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === "subscription") {
            const subscriptionId = checkoutSession.subscription;
            await manageSubscriptionStatusChange(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      logger.error(
        "Webhook handler failed",
        { scope: "stripe-webhook", eventType: event.type },
        error
      );
      return new NextResponse('Webhook error: "Webhook handler failed. View logs."', {
        status: 400,
      });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
