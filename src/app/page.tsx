import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CheckoutButton from "./checkout-button";

export const metadata: Metadata = {
  title: "Bair1 Air Quality Stack",
  description:
    "Bair1 connects a live air-quality device, mobile app, API, CLI, and MCP server into one stack.",
};

type IconName = "api" | "cli" | "device" | "docs" | "github" | "mcp" | "mobile" | "spark";

const NAV_ITEMS = [
  ["Home", "/"],
  ["Device", "#device"],
  ["Mobile", "#mobile"],
  ["API", "/developers#rest-api"],
  ["CLI", "/developers#cli"],
  ["MCP", "/developers#mcp"],
  ["Docs", "/developers"],
] as const;

const STACK_ITEMS: Array<{
  id: string;
  icon: IconName;
  title: string;
  description: string;
  sample: string;
}> = [
  {
    id: "cli",
    icon: "cli",
    title: "CLI",
    description: "Query live readings, export history, and automate local workflows from the terminal.",
    sample: "bair1 latest --device home",
  },
  {
    id: "mcp",
    icon: "mcp",
    title: "MCP Server",
    description: "Give agents air-quality context through structured tools and grounded responses.",
    sample: "mcp connect bair1",
  },
  {
    id: "api",
    icon: "api",
    title: "API",
    description: "REST and GraphQL endpoints for live readings, device history, analytics, and exports.",
    sample: "GET /api/v1/devices",
  },
  {
    id: "mobile-stack",
    icon: "mobile",
    title: "Mobile App",
    description: "Connect over BLE, review alerts, and keep the same dashboard model in your pocket.",
    sample: "BLE pairing + live AQI",
  },
  {
    id: "device-stack",
    icon: "device",
    title: "Device",
    description: "MG24-powered WiFi and BLE hardware built around particulate sensing and local display.",
    sample: "MG24 + PM sensors",
  },
];

const DEVICE_TIERS = [
  {
    tier: "lite",
    name: "Bair1 Lite",
    price: "£99",
    sensor: "Bosch BMV080",
    details: "Fanless PM1, PM2.5, and PM10 with WiFi, BLE, and OLED.",
    featured: false,
  },
  {
    tier: "pro",
    name: "Bair1 Pro",
    price: "£149",
    sensor: "BMV080 + PMSA003I",
    details: "Dual-sensor validation, MG24 BLE relay support, and API access.",
    featured: true,
  },
  {
    tier: "max",
    name: "Bair1 Max",
    price: "£229",
    sensor: "BMV080 + PMSA003I + SPS30",
    details: "Triple-sensor precision for deeper history and higher confidence.",
    featured: false,
  },
];

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "api") {
    return (
      <svg {...common}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 8 7.5 4.2L19.5 8" />
        <path d="M12 12.2V21" />
      </svg>
    );
  }

  if (name === "cli") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m7 10 2.4 2L7 14" />
        <path d="M12 15h5" />
      </svg>
    );
  }

  if (name === "device") {
    return (
      <svg {...common}>
        <path d="M8.2 8.1c-.6-.9-1.6-1.7-2.9-1.7-.3 1.4.1 2.6 1 3.4" />
        <path d="M15.8 8.1c.6-.9 1.6-1.7 2.9-1.7.3 1.4-.1 2.6-1 3.4" />
        <rect x="5.8" y="7.8" width="12.4" height="11" rx="5.2" />
        <path d="M9.5 12.3h.01" />
        <path d="M14.5 12.3h.01" />
        <path d="M11 15h2" />
      </svg>
    );
  }

  if (name === "docs") {
    return (
      <svg {...common}>
        <path d="M6 3.5h8l4 4v13H6z" />
        <path d="M14 3.5v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }

  if (name === "github") {
    return (
      <svg {...common}>
        <path d="M9 19.5c-4 .9-4-2-5.5-2.5" />
        <path d="M15 22v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6a4.7 4.7 0 0 0-1.3-3.3 4.4 4.4 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6 0C6.6 3.4 5.6 3.7 5.6 3.7a4.4 4.4 0 0 0-.1 3.3 4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.9 5.7 5.6 6A3 3 0 0 0 9 18.6V22" />
      </svg>
    );
  }

  if (name === "mcp") {
    return (
      <svg {...common}>
        <path d="M7 4v6" />
        <path d="M17 4v6" />
        <path d="M5 10h14v2a7 7 0 0 1-14 0z" />
        <path d="M12 19v2" />
      </svg>
    );
  }

  if (name === "mobile") {
    return (
      <svg {...common}>
        <rect x="7" y="2.8" width="10" height="18.4" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 3 1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8z" />
      <path d="M19 16.5 20 20l3 1-3 1-1 3-1-3-3-1 3-1z" />
    </svg>
  );
}

function StackDock() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-white/72">
      {STACK_ITEMS.map((item) => (
        <a
          key={item.title}
          href={`#${item.id}`}
          className="inline-flex h-10 items-center gap-2 border border-border bg-bg/35 px-3 transition hover:border-primary/55 hover:text-white"
        >
          <Icon name={item.icon} className="h-4 w-4" />
          {item.title}
        </a>
      ))}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg border border-primary/45 bg-surface/92 shadow-2xl shadow-black/60">
        <div className="flex h-12 items-center gap-3 border-b border-primary/25 bg-bg/70 px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
          </div>
          <div className="hidden h-7 flex-1 items-center justify-center border border-white/10 bg-white/[0.03] text-xs text-white/45 md:flex">
            dashboard.bair1.live
          </div>
        </div>

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[170px_1fr]">
          <aside className="hidden border-r border-primary/20 bg-bg/35 p-4 md:block">
            <div className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-[0.18em] text-white">
              <Image src="/bear-logo.png" alt="" width={30} height={30} className="h-7 w-7" />
              BAIR<span className="text-primary">1</span>
            </div>
            <div className="space-y-2 text-xs text-white/60">
              {["Overview", "Devices", "Alerts", "History"].map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 border px-3 py-2 ${
                    index === 0
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-transparent"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Air Quality</div>
                <div className="mt-1 text-xs text-white/45">Sample reading</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Live-ready
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
              <div className="flex flex-col items-center justify-center border border-white/10 bg-white/[0.03] p-5">
                <div className="relative h-40 w-56">
                  <svg viewBox="0 0 220 150" className="h-full w-full">
                    <path
                      d="M35 118 A75 75 0 0 1 185 118"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeLinecap="round"
                      strokeWidth="14"
                    />
                    <path
                      d="M35 118 A75 75 0 0 1 170 72"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeLinecap="round"
                      strokeWidth="14"
                    />
                  </svg>
                  <div className="absolute inset-x-0 top-14 text-center">
                    <div className="text-6xl font-light tracking-normal text-white">32</div>
                    <div className="mt-1 text-xs font-medium uppercase text-white/55">AQI</div>
                    <div className="mt-1 text-lg font-semibold text-primary">Good</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-white/55">
                  <span>MG24 BLE</span>
                  <span className="h-1 w-1 rounded-full bg-white/35" />
                  <span>WiFi bridge</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["PM2.5", "12", "ug/m3", "var(--color-primary)"],
                  ["PM10", "24", "ug/m3", "var(--color-clean-air)"],
                  ["Temp", "22.4", "C", "var(--color-accent)"],
                  ["Humidity", "48", "%", "var(--color-muted)"],
                ].map(([label, value, unit, color]) => (
                  <div key={label} className="border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/45">{label}</div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-3xl font-light tracking-normal text-white">{value}</div>
                        <div className="mt-0.5 text-[11px] text-white/45">{unit}</div>
                      </div>
                      <svg width="64" height="28" viewBox="0 0 64 28" aria-hidden="true">
                        <path
                          d="M2 18c8 0 8-7 16-7s8 7 16 7 8-7 16-7 8 5 12 5"
                          fill="none"
                          stroke={color}
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[120px_1fr]">
              <div className="relative min-h-28 overflow-hidden bg-black/30">
                <Image
                  src="/bair1-device-only.png"
                  alt="Bair1 air quality hardware device"
                  fill
                  sizes="160px"
                  className="object-cover object-center opacity-90"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-white/45">Device</div>
                  <div className="mt-1 text-sm font-semibold text-white">Bair1 Pro</div>
                </div>
                <div>
                  <div className="text-xs text-white/45">Transport</div>
                  <div className="mt-1 text-sm font-semibold text-primary">BLE + WiFi</div>
                </div>
                <div>
                  <div className="text-xs text-white/45">Firmware</div>
                  <div className="mt-1 text-sm font-semibold text-white">MG24-ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 left-1/2 hidden w-[82%] -translate-x-1/2 items-center justify-between rounded-lg border border-primary/45 bg-bg/90 p-2 shadow-xl shadow-black/50 lg:flex">
        {STACK_ITEMS.map((item) => (
          <a
            key={item.title}
            href={`#${item.id}`}
            className="flex items-center gap-2 px-3 py-2 text-xs text-white/70 transition hover:text-primary"
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-white">
      <section className="relative min-h-[calc(100svh-6rem)] overflow-hidden border-b border-white/10">
        <Image
          src="/bair1-hero-texture.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55 saturate-[0.75] hue-rotate-[55deg]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,4,0.92)_0%,rgba(5,6,4,0.72)_40%,rgba(5,6,4,0.22)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg to-transparent" />

        <header className="relative z-10 mx-auto flex max-w-[1920px] items-center justify-between px-6 py-7 sm:px-10 lg:px-16">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/bear-logo.png" alt="Bair1" width={42} height={42} className="h-10 w-10" />
            <span className="text-xl font-semibold tracking-[0.22em] text-white">
              BAIR<span className="text-primary">1</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/70 lg:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map(([label, href], index) => (
              <Link
                key={label}
                href={href}
                className={`border-b pb-2 transition ${
                  index === 0
                    ? "border-primary text-primary"
                    : "border-transparent hover:border-white/30 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/Hey-Salad/bair-one-air-monitor"
              className="hidden h-10 items-center gap-2 rounded-full border border-white/15 bg-bg/30 px-4 text-sm text-white/80 transition hover:border-primary/55 hover:text-white sm:flex"
            >
              <Icon name="github" className="h-4 w-4" />
              GitHub
            </Link>
            <Link
              href="https://app.bair1.live"
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1920px] items-center gap-12 px-6 pb-16 pt-10 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-16 lg:pb-24 lg:pt-14">
          <div>
            <h1 className="max-w-5xl font-sans text-6xl font-light leading-[0.98] tracking-normal text-white sm:text-7xl lg:text-[7.5rem]">
              <span className="block">Bair1</span>
              <span className="block">air quality stack.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              A live device, mobile app, API, CLI, and MCP server for air quality data you can act on.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="https://app.bair1.live"
                className="inline-flex h-14 items-center gap-3 rounded-md bg-primary px-7 text-base font-semibold text-white transition hover:bg-primary-hover"
              >
                Open dashboard
                <span aria-hidden="true">-&gt;</span>
              </Link>
              <Link
                href="/developers"
                className="inline-flex h-14 items-center gap-3 rounded-md border border-white/15 bg-bg/20 px-7 text-base font-semibold text-white/80 transition hover:border-primary/60 hover:text-white"
              >
                Read docs
                <Icon name="docs" className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10">
              <StackDock />
            </div>
          </div>

          <DashboardMockup />
        </div>
      </section>

      <section className="border-b border-white/10 bg-black" aria-labelledby="stack-heading">
        <div className="mx-auto max-w-[1440px] px-6 py-14 sm:px-10 lg:px-14">
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 id="stack-heading" className="text-3xl font-light tracking-normal text-white sm:text-4xl">
                One stack, five ways in.
              </h2>
              <p className="mt-3 max-w-2xl text-white/58">
                The same readings move from the physical device into people-facing apps and agent-facing tools.
              </p>
            </div>
            <Link href="/developers" className="text-sm font-semibold text-primary hover:text-clean-air">
              Developer platform -&gt;
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {STACK_ITEMS.map((item) => (
              <article
                id={item.id}
                key={item.title}
                className="min-h-60 border border-primary/25 bg-surface p-6"
              >
                <Icon name={item.icon} className="h-8 w-8 text-white/80" />
                <h3 className="mt-5 text-xl font-semibold tracking-normal text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/58">{item.description}</p>
                <div className="mt-6 border border-white/10 bg-bg/55 px-3 py-2 font-mono text-xs text-primary">
                  {item.sample}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="mobile" className="overflow-hidden border-b border-white/10 bg-bg">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-14">
          <div>
            <h2 className="text-4xl font-light tracking-normal text-white sm:text-5xl">The live UI follows the dashboard.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/62">
              Bair1 keeps the same air-quality model across the web dashboard, iPhone flow, BLE pairing, and developer surfaces.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["BLE", "Connect the MG24 device from the iPhone path."],
              ["Live", "Show the same AQI state, PM readings, and guidance as the dashboard."],
              ["Agents", "Expose data through MCP and API instead of screenshots or scraped UI."],
            ].map(([title, body]) => (
              <div key={title} className="border border-white/10 bg-white/[0.03] p-6">
                <div className="text-4xl font-light text-primary">{title}</div>
                <p className="mt-5 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="device" className="bg-black">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-14">
          <div>
            <Image
              src="/bair1-device-only.png"
              alt="Bair1 air quality hardware device without the carry case"
              width={880}
              height={1184}
              className="h-full max-h-[660px] w-full rounded-lg object-cover object-center"
            />
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="text-4xl font-light tracking-normal text-white sm:text-5xl">Bair1 device kits.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/62">
              WiFi, BLE, OLED, and one year of Pro software. Choose the sensing package that fits the job.
            </p>

            <div className="mt-8 grid gap-4">
              {DEVICE_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className={`grid gap-4 border p-5 sm:grid-cols-[1fr_auto] sm:items-center ${
                    tier.featured
                      ? "border-primary/55 bg-primary/8"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold tracking-normal text-white">{tier.name}</h3>
                      {tier.featured && (
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-medium text-primary">{tier.sensor}</div>
                    <p className="mt-2 text-sm leading-6 text-white/58">{tier.details}</p>
                  </div>

                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <div className="text-3xl font-light tracking-normal text-white">{tier.price}</div>
                    <CheckoutButton
                      tier={tier.tier}
                      className={`h-11 rounded-md px-5 text-sm font-semibold transition ${
                        tier.featured
                          ? "bg-primary text-white hover:bg-primary-hover"
                          : "border border-white/15 text-white hover:border-primary/60"
                      }`}
                    >
                      Order
                    </CheckoutButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-bg">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-10 text-sm text-white/48 sm:px-10 md:flex-row md:items-center md:justify-between lg:px-14">
          <div className="flex items-center gap-3">
            <Image src="/bear-logo.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span>Bair1 by HeySalad</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="https://app.bair1.live" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/developers" className="hover:text-white">
              Developers
            </Link>
            <Link href="/firmware" className="hover:text-white">
              Firmware
            </Link>
            <a href="mailto:hello@heysalad.app" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
