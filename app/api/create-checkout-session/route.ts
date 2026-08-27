import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { stripe } from "@/libs/stripe";
import { getURL } from "@/libs/helpers";
import { createOrRetrieveCustomer } from "@/libs/supabaseAdmin";

const checkoutSchema = z.object({
  price: z.object({
    id: z.string().min(1),
  }),
  quantity: z.number().int().positive().max(10).default(1),
  metadata: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Previously missing: an unauthenticated request fell through with
    // uuid: '' and created an orphan Stripe customer.
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return new NextResponse("Invalid request body", { status: 400 });
    }
    const { price, quantity, metadata } = parsed.data;

    // Never trust a client-supplied price. Confirm it exists and is active
    // before handing it to Stripe.
    const { data: dbPrice } = await supabase
      .from("prices")
      .select("id")
      .eq("id", price.id)
      .eq("active", true)
      .single();

    if (!dbPrice) {
      return new NextResponse("Unknown or inactive price", { status: 400 });
    }

    const customer = await createOrRetrieveCustomer({
      uuid: user.id,
      email: user.email || "",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer,
      line_items: [
        {
          price: dbPrice.id,
          quantity,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata,
      },
      success_url: `${getURL()}/account`,
      cancel_url: `${getURL()}/`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("[create-checkout-session]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
