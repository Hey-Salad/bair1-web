import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const PRODUCTS: Record<string, { name: string; description: string; price: number }> = {
  lite: {
    name: "Bair1 Lite",
    description: "1 sensor — Bosch BMV080. Includes 1 year Bair1 Pro software.",
    price: 9900, // £99 in pence
  },
  pro: {
    name: "Bair1 Pro",
    description: "2 sensors — BMV080 + PMSA003I dual cross-validation. Includes 1 year Bair1 Pro + API.",
    price: 14900, // £149 in pence
  },
  max: {
    name: "Bair1 Max",
    description: "3 sensors — BMV080 + PMSA003I + Sensirion SPS30. Research-grade. Includes 1 year Pro + API.",
    price: 22900, // £229 in pence
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tier = body.tier as string;

  const product = PRODUCTS[tier];
  if (!product) {
    return NextResponse.json({ error: "Invalid product tier" }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: product.name,
            description: product.description,
            images: ["https://bair1.live/bear-sensor-front.jpg"],
          },
          unit_amount: product.price,
        },
        quantity: 1,
      },
    ],
    shipping_address_collection: {
      allowed_countries: ["GB", "US", "DE", "FR", "NL", "IE", "SE", "NO", "DK", "FI", "AT", "CH", "BE", "ES", "IT", "PT", "EE"],
    },
    success_url: `${req.nextUrl.origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.nextUrl.origin}/#sensor`,
  });

  return NextResponse.json({ url: session.url });
}
