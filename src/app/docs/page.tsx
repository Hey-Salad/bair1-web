import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Bair1 Docs — Live Air, Explained",
  description:
    "How Bair1 moves real particulate readings from a bear-shaped sensor to a public dashboard, London context, and GPT-5.6 insights.",
  openGraph: {
    title: "Bair1 Docs — Live Air, Explained",
    description: "From physical sensor to grounded air-quality insight.",
  },
};

const flowSteps = [
  ["01", "Sense", "SPS30, Plantower, and BMV080 measure PM1, PM2.5, and PM10."],
  ["02", "Store", "The device stream becomes a time-series history in DynamoDB."],
  ["03", "Compare", "The public feed combines indoor data with LAQN, weather, and pollen."],
  ["04", "Explain", "GPT-5.6-terra turns the current evidence into plain English."],
];

const surfaces = [
  ["Live air", "30-minute history, a browser-side trend forecast, current readings, and an Air Insight grounded in the numbers.", "/live/kitchen"],
  ["London map", "Indoor readings beside the London Air Quality Network, so a kitchen measurement has outdoor context.", "/live/kitchen"],
  ["Data Studio", "Ask what changed, compare the forecast, and inspect the answer against the data behind it.", "/live/kitchen"],
  ["Developer platform", "REST, GraphQL, CLI, and MCP tools make Bair1 readings available to products and agents.", "/developers"],
];

function Dot() {
  return <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_18px_var(--color-primary)]" />;
}

export default function DocsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-ink">
      <header className="border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-10">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden border-l border-border pl-4 font-mono text-xs text-muted sm:inline">Docs</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/live/kitchen" className="transition hover:text-ink">Live air</Link>
            <Link href="/developers" className="transition hover:text-ink">Developers</Link>
            <a href="https://github.com/Hey-Salad/bair1-web" className="transition hover:text-ink">GitHub</a>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklab,var(--color-primary)_23%,transparent),transparent_28rem)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Bair1 documentation</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-medium tracking-tight sm:text-6xl">A physical sensor, a live public feed, and AI that stays grounded.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
              Bair1 makes indoor air observable. Real kitchen sensors stream particulate readings to a public dashboard,
              then GPT-5.6-terra explains what those measurements mean in context.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/live/kitchen" className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover">
                Open live kitchen feed <span aria-hidden="true">→</span>
              </Link>
              <Link href="/developers" className="inline-flex items-center gap-2 border border-border bg-surface px-5 py-3 text-sm font-semibold transition hover:border-primary/60">
                Developer reference
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative overflow-hidden border border-primary/35 bg-surface p-4 shadow-2xl shadow-black/50">
              <Image src="/bair1-hardware-demo.png" alt="Bair1 bear-shaped sensor hardware" width={840} height={840} className="aspect-square w-full object-cover" priority />
              <div className="mt-4 flex items-center justify-between font-mono text-xs text-muted">
                <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#00e676]" /> Live prototype</span>
                <span>PM1 · PM2.5 · PM10</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">System flow</p>
          <h2 className="mt-4 text-4xl font-medium">From particles to a useful answer.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map(([number, title, description], index) => (
            <article key={title} className="relative border border-border bg-surface p-6">
              {index < flowSteps.length - 1 && <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center bg-bg text-primary xl:flex">→</span>}
              <span className="font-mono text-xs text-primary">{number}</span>
              <h3 className="mt-8 text-2xl font-semibold">{title}</h3>
              <p className="mt-3 leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/35">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Grounded AI</p>
            <h2 className="mt-4 text-4xl font-medium">GPT-5.6 sees the evidence, not just the question.</h2>
            <p className="mt-6 leading-7 text-muted">
              The public Air Insight and Data Studio run server-side. They receive a fresh snapshot of the feed and return
              useful language that cites the actual PM values, history, forecast, and local context.
            </p>
          </div>
          <div className="border border-primary/25 bg-bg p-6 font-mono text-sm">
            <div className="flex items-center gap-3 border-b border-border pb-4 text-primary"><i className="h-2 w-2 rounded-full bg-primary" /> Insight context</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Latest readings from every feed sensor", "30-minute history and trend forecast", "LAQN PM2.5 and PM10 comparison", "Weather and pollen where available"].map((item) => (
                <div key={item} className="flex gap-3 border border-border bg-surface/50 p-4 text-muted"><Dot /><span>{item}</span></div>
              ))}
            </div>
            <div className="mt-4 border border-primary/45 bg-primary/10 p-4 text-ink">Strict JSON insight → headline, explanation, concrete advice, confidence.</div>
            <p className="mt-4 text-xs leading-5 text-muted">The insight route caches each feed for approximately two minutes. If a source is unavailable, the numbers-only dashboard continues to work.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Explore the stack</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {surfaces.map(([title, description, href]) => (
            <Link key={title} href={href} className="group border border-border bg-surface p-6 transition hover:border-primary/60 hover:bg-surface/70">
              <span className="font-mono text-xs text-primary">Bair1 / {title}</span>
              <h3 className="mt-5 text-2xl font-semibold group-hover:text-primary">{title}</h3>
              <p className="mt-3 max-w-xl leading-6 text-muted">{description}</p>
              <span className="mt-6 inline-flex text-sm font-semibold">Explore <span className="ml-2">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>Bair1 — real air data, made understandable.</span>
          <div className="flex gap-5"><Link href="/live/kitchen" className="hover:text-ink">Live feed</Link><Link href="/developers" className="hover:text-ink">API docs</Link></div>
        </div>
      </footer>
    </main>
  );
}
