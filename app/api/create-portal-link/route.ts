import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

import { stripe } from "@/libs/stripe";
import { getURL } from "@/libs/helpers";
import { createOrRetrieveCustomer } from "@/libs/supabaseAdmin";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const customer = await createOrRetrieveCustomer({
      uuid: user.id,
      email: user.email || "",
    });

    if (!customer) {
      return new NextResponse("Could not get customer", { status: 400 });
    }

    const { url } = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${getURL()}/account`,
    });

    return NextResponse.json({ url });
  } catch (err) {
    // Previously this branch constructed a NextResponse without returning it,
    // so the route resolved to undefined and the client called
    // window.location.assign(undefined).
    console.error("[create-portal-link]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
