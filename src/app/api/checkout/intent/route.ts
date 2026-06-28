import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const PRODUCTS: Record<string, { name: string; price: number }> = {
  lite: { name: "Bair1 Dev Kit — Lite", price: 9900 },
  pro: { name: "Bair1 Dev Kit — Pro", price: 14900 },
  max: { name: "Bair1 Dev Kit — Max", price: 22900 },
};

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tier = body.tier as string;
    const promoCode = body.promoCode as string | undefined;

    const product = PRODUCTS[tier];
    if (!product) {
      return NextResponse.json({ error: "Invalid product tier" }, { status: 400 });
    }

    const stripe = getStripe();
    let amount = product.price;
    let appliedPromo: { code: string; amountOff: number } | null = null;

    // Apply promotion code if provided
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          const promo = promoCodes.data[0];
          const promotion = promo.promotion;
          if (promotion && typeof promotion === "object" && promotion.type === "coupon" && promotion.coupon) {
            const couponRef = promotion.coupon;
            const coupon = typeof couponRef === "string"
              ? await stripe.coupons.retrieve(couponRef)
              : couponRef;
            if (coupon.amount_off && coupon.currency === "gbp") {
              const discount = coupon.amount_off;
              amount = Math.max(0, amount - discount);
              appliedPromo = { code: promoCode, amountOff: discount };
            } else if (coupon.percent_off) {
              const discount = Math.round(amount * coupon.percent_off / 100);
              amount = Math.max(0, amount - discount);
              appliedPromo = { code: promoCode, amountOff: discount };
            }
          }
        } else {
          return NextResponse.json({ error: "Invalid promotion code" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Could not validate promotion code" }, { status: 400 });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      metadata: {
        tier,
        product: product.name,
        ...(appliedPromo ? { promoCode: appliedPromo.code, discount: String(appliedPromo.amountOff) } : {}),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      appliedPromo,
    });
  } catch (err) {
    console.error("Payment intent error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment failed" },
      { status: 500 }
    );
  }
}
