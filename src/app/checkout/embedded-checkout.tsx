"use client";

import { useState, useCallback, FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const STRIPE_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#4d9a3f",
    colorBackground: "#1f2a1f",
    colorText: "#eef2ee",
    colorTextSecondary: "#8a9a8a",
    colorDanger: "#e5534b",
    fontFamily: "Figtree, system-ui, sans-serif",
    borderRadius: "10px",
    spacingUnit: "4px",
    fontSizeBase: "15px",
    colorIcon: "#8a9a8a",
    colorIconHover: "#eef2ee",
  },
  rules: {
    ".Input": {
      backgroundColor: "#162016",
      border: "1px solid #2a3d2a",
      boxShadow: "none",
      padding: "12px 14px",
    },
    ".Input:focus": {
      border: "1px solid #4d9a3f",
      boxShadow: "0 0 0 1px #4d9a3f",
    },
    ".Input:hover": {
      border: "1px solid #3a5d3a",
    },
    ".Label": {
      color: "#8a9a8a",
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "6px",
    },
    ".Tab": {
      backgroundColor: "#162016",
      border: "1px solid #2a3d2a",
      color: "#8a9a8a",
    },
    ".Tab:hover": {
      backgroundColor: "#1f2a1f",
      border: "1px solid #3a5d3a",
      color: "#eef2ee",
    },
    ".Tab--selected": {
      backgroundColor: "#1f2a1f",
      border: "1px solid #4d9a3f",
      color: "#eef2ee",
    },
    ".TabIcon--selected": {
      fill: "#4d9a3f",
    },
    ".Block": {
      backgroundColor: "#162016",
      border: "1px solid #2a3d2a",
      borderRadius: "10px",
    },
    ".PickerItem": {
      backgroundColor: "#162016",
      border: "1px solid #2a3d2a",
      color: "#eef2ee",
    },
    ".PickerItem:hover": {
      backgroundColor: "#1f2a1f",
      border: "1px solid #3a5d3a",
    },
    ".PickerItem--selected": {
      border: "1px solid #4d9a3f",
    },
  },
};

function CheckoutForm({
  tier,
  amount,
  promoDiscount,
  promoCode: appliedCode,
}: {
  tier: string;
  amount: number;
  promoDiscount: number | null;
  promoCode: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/success`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Shipping */}
      <div>
        <h3 className="text-ink text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Shipping address
        </h3>
        <AddressElement
          options={{
            mode: "shipping",
            allowedCountries: ["GB", "US", "DE", "FR", "NL", "IE", "SE", "NO", "DK", "FI", "AT", "CH", "BE", "ES", "IT", "PT", "EE"],
          }}
        />
      </div>

      {/* Payment */}
      <div>
        <h3 className="text-ink text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Payment
        </h3>
        <PaymentElement />
      </div>

      {/* Promo applied notice */}
      {appliedCode && promoDiscount && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{appliedCode}</span> applied — £{(promoDiscount / 100).toFixed(0)} off
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-primary text-white font-semibold py-4 rounded-xl text-base hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay £${(amount / 100).toFixed(0)}`
        )}
      </button>

      <p className="text-center text-xs text-muted">
        Powered by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
}

export function BairCheckout({ tier, price, initialPromo }: { tier: string; price: number; initialPromo?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(price);
  const [promoCode, setPromoCode] = useState(initialPromo?.toUpperCase() || "");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const createIntent = useCallback(async (promo?: string) => {
    setInitializing(true);
    try {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, ...(promo ? { promoCode: promo } : {}) }),
      });
      const data = await res.json();
      if (data.error) {
        setPromoError(data.error);
        return null;
      }
      setClientSecret(data.clientSecret);
      setAmount(data.amount);
      if (data.appliedPromo) {
        setAppliedPromo(data.appliedPromo.code);
        setPromoDiscount(data.appliedPromo.amountOff);
      }
      return data;
    } finally {
      setInitializing(false);
    }
  }, [tier]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setClientSecret(null);
    const result = await createIntent(promoCode.trim());
    if (!result) {
      // Re-create without promo
      await createIntent();
    }
    setPromoLoading(false);
  };

  // Initialize on first render (auto-apply promo from URL if provided)
  if (!clientSecret && !initializing) {
    createIntent(initialPromo || undefined);
  }

  return (
    <div className="space-y-6">
      {/* Promo code */}
      <div>
        <label className="text-xs font-medium text-muted mb-2 block">Promotion code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            disabled={!!appliedPromo}
            className="flex-1 bg-[#162016] border border-border rounded-lg px-4 py-3 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !!appliedPromo || !promoCode.trim()}
            className="px-5 py-3 bg-surface border border-border rounded-lg text-sm font-medium text-ink hover:bg-border/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {promoLoading ? "..." : appliedPromo ? "Applied" : "Apply"}
          </button>
        </div>
        {promoError && (
          <p className="text-xs text-red-400 mt-2">{promoError}</p>
        )}
      </div>

      {/* Stripe Elements */}
      {clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: STRIPE_APPEARANCE,
            fonts: [
              {
                cssSrc: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&display=swap",
              },
            ],
          }}
        >
          <CheckoutForm
            tier={tier}
            amount={amount}
            promoDiscount={promoDiscount}
            promoCode={appliedPromo}
          />
        </Elements>
      ) : (
        <div className="flex items-center justify-center py-20">
          <svg className="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
