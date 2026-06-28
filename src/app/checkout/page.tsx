import Image from "next/image";
import Link from "next/link";
import { BairCheckout } from "./embedded-checkout";

const TIERS: Record<string, { name: string; subtitle: string; price: string; priceNum: number; sensors: string; features: string[] }> = {
  lite: {
    name: "Bair1 Dev Kit — Lite",
    subtitle: "1 sensor",
    price: "£99",
    priceNum: 9900,
    sensors: "Bosch BMV080",
    features: ["PM1, PM2.5 & PM10", "Fanless — silent", "WiFi + BLE", "OLED display", "OTA updates", "1 year Pro free"],
  },
  pro: {
    name: "Bair1 Dev Kit — Pro",
    subtitle: "2 sensors",
    price: "£149",
    priceNum: 14900,
    sensors: "BMV080 + PMSA003I",
    features: ["Dual cross-validation", "Laser + photoacoustic", "Higher accuracy", "Wildfire smoke detection", "API access", "1 year Pro free"],
  },
  max: {
    name: "Bair1 Dev Kit — Max",
    subtitle: "3 sensors",
    price: "£229",
    priceNum: 22900,
    sensors: "BMV080 + PMSA003I + SPS30",
    features: ["Triple cross-validation", "Research-grade accuracy", "10-year sensor lifespan", "Priority support", "API access", "1 year Pro + API free"],
  },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ tier?: string; promo?: string }> }) {
  const params = await searchParams;
  const tier = params.tier || "pro";
  const promo = params.promo || "";
  const product = TIERS[tier] || TIERS.pro;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <nav className="border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/bear-logo.png" alt="Bair1" width={32} height={32} className="object-contain" />
            <span className="text-lg font-bold tracking-tight text-ink" style={{ fontFamily: 'var(--font-display)' }}>
              Bair<span className="text-primary">1</span>
            </span>
          </Link>
          <Link href="/#sensor" className="text-sm text-muted hover:text-ink transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to store
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 sm:py-16">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-ink text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Checkout
          </h1>
          <p className="text-muted text-sm">Complete your order for the {product.name}.</p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14">
          {/* Left: Payment form */}
          <div className="order-2 lg:order-1">
            <BairCheckout tier={tier} price={product.priceNum} initialPromo={promo} />
          </div>

          {/* Right: Order summary */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
                <h3 className="text-ink text-sm font-semibold mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Your order
                </h3>

                <div className="flex gap-4 items-start mb-5">
                  <Image
                    src="/bear-sensor-front.jpg"
                    alt="Bair1 sensor"
                    width={72}
                    height={72}
                    className="rounded-xl object-cover shrink-0 border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-ink font-bold text-sm">{product.name}</h4>
                    <p className="text-xs text-muted mt-0.5">{product.subtitle} — {product.sensors}</p>
                    <p className="text-xs text-muted/60 mt-1">Qty: 1</p>
                  </div>
                  <span className="text-ink font-bold text-sm shrink-0">{product.price}</span>
                </div>

                <div className="border-t border-border pt-4 space-y-2.5">
                  {product.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs text-muted">
                      <svg className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>

                <div className="border-t border-border mt-5 pt-4">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Subtotal</span>
                    <span>{product.price}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted mb-3">
                    <span>Shipping</span>
                    <span className="text-primary">Free</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-border pt-3">
                    <span className="text-sm font-medium text-ink">Total</span>
                    <span className="text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                      {product.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust signals */}
              <div className="space-y-3 px-1">
                {[
                  { icon: "M5 13l4 4L19 7", label: "Ships August 2026" },
                  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Secure payment via Stripe" },
                  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Card details never touch our servers" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2.5 text-xs text-muted">
                    <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                    </svg>
                    {t.label}
                  </div>
                ))}
              </div>

              {/* Switch tier */}
              <div className="mt-6 pt-5 border-t border-border px-1">
                <p className="text-xs text-muted mb-3">Switch kit:</p>
                <div className="flex gap-2">
                  {(["lite", "pro", "max"] as const).map((t) => (
                    <Link
                      key={t}
                      href={`/checkout?tier=${t}`}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        t === tier
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted hover:border-muted hover:text-ink"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)} — {TIERS[t].price}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
