import Image from "next/image";
import Link from "next/link";

const AQI_STATES = [
  { level: "Good", range: "0–50", color: "#8DC44A", emoji: "Eyes closed, smiling", guidance: "Open windows. Enjoy outdoor activity." },
  { level: "Moderate", range: "51–100", color: "#F5C542", emoji: "Neutral, watchful", guidance: "Sensitive groups take care outdoors." },
  { level: "Sensitive", range: "101–150", color: "#ED8B00", emoji: "Furrowed brow", guidance: "Limit prolonged outdoor time." },
  { level: "Unhealthy", range: "151–200", color: "#D63031", emoji: "Wide eyes, worried", guidance: "Reduce outdoor exertion." },
  { level: "Very Unhealthy", range: "201–300", color: "#6C3483", emoji: "Alarmed", guidance: "Avoid outdoor activity." },
  { level: "Hazardous", range: "301+", color: "#4A4A4A", emoji: "Distressed", guidance: "Stay indoors. Close all windows." },
];

const FEATURES = [
  {
    title: "Real-Time AQI",
    description: "Live air quality from your own sensor or nearby public monitors. Updated every 60 seconds.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Sensor Map",
    description: "See air quality across your city. Colour-coded pins show conditions at a glance.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    title: "7-Day History",
    description: "Spot patterns. See which days are clean and which spike. Plan your week around the air.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Smart Alerts",
    description: "Set thresholds. Get notified before conditions worsen, not after. Morning briefings included.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
];

const STEPS = [
  { step: "1", title: "Plug in your sensor", description: "The Bair1 node connects to WiFi and starts publishing air quality readings in under 2 minutes." },
  { step: "2", title: "Bear sniffs the air", description: "Your readings appear instantly. The bear reacts — its expression and orb colour tell you everything." },
  { step: "3", title: "You act", description: "Clear guidance: open windows, wear a mask, stay indoors. No jargon, no guessing." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F2F4F0]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/bear-logo.png" alt="Bair1" width={40} height={40} className="object-contain" />
            <span className="text-2xl font-bold tracking-tight text-forest-night" style={{ fontFamily: 'var(--font-display)' }}>
              Bair<span className="text-bair-green">1</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-forest-night/70 hover:text-forest-night transition-colors hidden sm:block"
            >
              Dashboard
            </Link>
            <Link
              href="#sensor"
              className="bg-bair-green text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-bair-green/90 transition-colors"
            >
              Get a Bair1 Sensor
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="flex flex-col items-center text-center">
            <div className="bear-breathe mb-8">
              <Image
                src="/bear-logo.png"
                alt="Bair1 bear sniffing the air"
                width={240}
                height={240}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-forest-night max-w-2xl leading-tight">
              Know your air.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-forest-night/60 max-w-xl leading-relaxed">
              The bear sniffs the air so you don&apos;t have to. Real-time air quality,
              honestly delivered — from your own sensor to your screen.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="bg-bair-green text-white font-medium px-8 py-3.5 rounded-full text-base hover:bg-bair-green/90 transition-colors shadow-lg shadow-bair-green/25"
              >
                Open Dashboard
              </Link>
              <Link
                href="#sensor"
                className="bg-white text-forest-night font-medium px-8 py-3.5 rounded-full text-base border border-forest-night/10 hover:border-forest-night/20 transition-colors"
              >
                Get a Bair1 Sensor
              </Link>
            </div>

            {/* Trust line */}
            <p className="mt-10 text-xs text-forest-night/40">
              Live at bair1.live · London-first · A HeySalad product
            </p>
          </div>
        </div>

        {/* Subtle gradient bg */}
        {/* No gradient — keep background consistent */}
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-forest-night mb-4">
            How it works
          </h2>
          <p className="text-center text-forest-night/50 mb-14 max-w-lg mx-auto">
            From sensor to screen in under 2 minutes. No apps to configure, no accounts to create.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-clean-air/20 text-bair-green font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg text-forest-night mb-2">{s.title}</h3>
                <p className="text-sm text-forest-night/60 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-forest-night mb-4">
            Everything at a glance
          </h2>
          <p className="text-center text-forest-night/50 mb-14 max-w-lg mx-auto">
            One glance = full picture. Understand air quality in under 2 seconds.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-forest-night/5 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-clean-air/15 text-bair-green flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg text-forest-night mb-1.5">{f.title}</h3>
                <p className="text-sm text-forest-night/60 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AQI States */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-forest-night mb-4">
            The bear tells you everything
          </h2>
          <p className="text-center text-forest-night/50 mb-14 max-w-lg mx-auto">
            Six states. One glance. The orb colour and bear expression change with the air.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {AQI_STATES.map((s) => (
              <div
                key={s.level}
                className="rounded-2xl p-4 text-center border border-forest-night/5"
                style={{ backgroundColor: `${s.color}10` }}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-3"
                  style={{ backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}44` }}
                />
                <div className="text-sm font-bold text-forest-night">{s.level}</div>
                <div className="text-xs text-forest-night/50 mt-0.5">{s.range} AQI</div>
                <div className="text-xs text-forest-night/40 mt-2 leading-snug">{s.guidance}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sensor Products */}
      <section id="sensor" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-forest-night mb-4">
            Same bear. You choose the brains.
          </h2>
          <p className="text-center text-forest-night/50 mb-14 max-w-lg mx-auto">
            Every Bair1 includes WiFi, BLE, OLED display, and 1 year of Bair1 Pro software free.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Bair1 Lite — 1 sensor */}
            <div className="bg-white rounded-3xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-forest-night">Bair1 Lite</h3>
                  <p className="text-xs text-forest-night/50 mt-0.5">1 sensor</p>
                </div>
                <Image src="/bear-logo.png" alt="Bair1 Lite" width={48} height={48} className="object-contain" />
              </div>
              <div className="bg-bair-green/5 rounded-xl px-4 py-3 mb-5">
                <div className="text-xs font-medium text-bair-green uppercase tracking-wider mb-1">Sensor</div>
                <div className="text-sm font-bold text-forest-night">Bosch BMV080</div>
                <div className="text-xs text-forest-night/50">Photoacoustic — fanless &amp; silent</div>
              </div>
              <ul className="space-y-2 mb-7 flex-1">
                {[
                  "PM1, PM2.5 & PM10",
                  "Fanless — completely silent",
                  "WiFi + BLE connectivity",
                  "OLED live display",
                  "Over-the-air updates",
                  "1 year Pro software free",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-forest-night/70">
                    <svg className="w-4 h-4 text-bair-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2 mb-4">
                <div className="text-3xl font-bold text-forest-night">£99</div>
                <div className="text-xs text-forest-night/40 mb-1">free UK shipping</div>
              </div>
              <a
                href="mailto:hello@heysalad.app?subject=Bair1%20Lite%20Pre-order&body=I'd%20like%20to%20pre-order%20a%20Bair1%20Lite%20(1%20sensor)."
                className="bg-forest-night/10 text-forest-night font-medium px-6 py-3 rounded-full text-center hover:bg-forest-night/15 transition-colors text-sm"
              >
                Pre-order Lite
              </a>
            </div>

            {/* Bair1 Pro — 2 sensors (recommended) */}
            <div className="bg-forest-night rounded-3xl p-7 flex flex-col relative overflow-hidden ring-2 ring-clean-air/50 md:scale-105">
              <div className="absolute top-4 right-4 bg-clean-air text-forest-night text-xs font-bold px-3 py-1 rounded-full">
                Recommended
              </div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Bair1 Pro</h3>
                  <p className="text-xs text-fresh-linen/50 mt-0.5">2 sensors</p>
                </div>
                <Image src="/bear-logo.png" alt="Bair1 Pro" width={48} height={48} className="object-contain" />
              </div>
              <div className="bg-fresh-linen/10 rounded-xl px-4 py-3 mb-5">
                <div className="text-xs font-medium text-clean-air uppercase tracking-wider mb-1">Sensors</div>
                <div className="text-sm font-bold text-white">BMV080 + PMSA003I</div>
                <div className="text-xs text-fresh-linen/50">Photoacoustic + laser cross-validation</div>
              </div>
              <ul className="space-y-2 mb-7 flex-1">
                {[
                  "Everything in Lite, plus:",
                  "Dual-sensor cross-validation",
                  "Laser + photoacoustic fusion",
                  "Higher accuracy in all conditions",
                  "Wildfire smoke detection",
                  "API access included",
                  "1 year Pro software free",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-fresh-linen/80">
                    <svg className="w-4 h-4 text-clean-air shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2 mb-4">
                <div className="text-3xl font-bold text-white">£149</div>
                <div className="text-xs text-fresh-linen/40 mb-1">free UK shipping</div>
              </div>
              <a
                href="mailto:hello@heysalad.app?subject=Bair1%20Pro%20Pre-order&body=I'd%20like%20to%20pre-order%20a%20Bair1%20Pro%20(2%20sensors)."
                className="bg-clean-air text-forest-night font-medium px-6 py-3 rounded-full text-center hover:bg-clean-air/90 transition-colors text-sm"
              >
                Pre-order Pro
              </a>
            </div>

            {/* Bair1 Max — 3 sensors */}
            <div className="bg-white rounded-3xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-forest-night">Bair1 Max</h3>
                  <p className="text-xs text-forest-night/50 mt-0.5">3 sensors</p>
                </div>
                <Image src="/bear-logo.png" alt="Bair1 Max" width={48} height={48} className="object-contain" />
              </div>
              <div className="bg-bair-green/5 rounded-xl px-4 py-3 mb-5">
                <div className="text-xs font-medium text-bair-green uppercase tracking-wider mb-1">Sensors</div>
                <div className="text-sm font-bold text-forest-night">BMV080 + PMSA003I + SPS30</div>
                <div className="text-xs text-forest-night/50">Triple-sensor, research-grade precision</div>
              </div>
              <ul className="space-y-2 mb-7 flex-1">
                {[
                  "Everything in Pro, plus:",
                  "Sensirion SPS30 long-life laser",
                  "Triple cross-validation",
                  "Research-grade accuracy",
                  "10-year sensor lifespan (SPS30)",
                  "Priority support",
                  "1 year Pro + API free",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-forest-night/70">
                    <svg className="w-4 h-4 text-bair-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2 mb-4">
                <div className="text-3xl font-bold text-forest-night">£229</div>
                <div className="text-xs text-forest-night/40 mb-1">free UK shipping</div>
              </div>
              <a
                href="mailto:hello@heysalad.app?subject=Bair1%20Max%20Pre-order&body=I'd%20like%20to%20pre-order%20a%20Bair1%20Max%20(3%20sensors)."
                className="bg-forest-night/10 text-forest-night font-medium px-6 py-3 rounded-full text-center hover:bg-forest-night/15 transition-colors text-sm"
              >
                Pre-order Max
              </a>
            </div>
          </div>

          {/* Shipping note */}
          <p className="text-center text-xs text-forest-night/40 mt-8">
            All models ship July 2026 and include 1 year of Bair1 Pro software (worth £59.88). Cancel anytime after.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-forest-night mb-3">Ready to know your air?</h2>
          <p className="text-forest-night/50 mb-8">Open the live dashboard or grab a sensor for your neighbourhood.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="bg-bair-green text-white font-medium px-8 py-3.5 rounded-full hover:bg-bair-green/90 transition-colors shadow-lg shadow-bair-green/25"
            >
              Open Dashboard
            </Link>
            <Link
              href="#sensor"
              className="bg-white text-forest-night font-medium px-8 py-3.5 rounded-full border border-forest-night/10 hover:border-forest-night/20 transition-colors"
            >
              Get a Bair1 Sensor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F2F4F0] text-forest-night/50 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image src="/bear-logo.png" alt="Bair1" width={28} height={28} className="object-contain" />
              <span className="text-sm font-medium text-forest-night/60">
                Bair1 — A HeySalad Product
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/dashboard" className="hover:text-forest-night transition-colors">Dashboard</Link>
              <a href="mailto:hello@heysalad.app" className="hover:text-forest-night transition-colors">Contact</a>
              <span className="text-forest-night/30">bair1.live</span>
            </div>
          </div>
          <div className="mt-6 pt-6 text-center text-xs text-forest-night/30">
            &copy; {new Date().getFullYear()} HeySalad. Know your air.
          </div>
        </div>
      </footer>
    </div>
  );
}
