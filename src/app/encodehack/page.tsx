import Image from "next/image";
import Link from "next/link";

const videos = [
  {
    title: "Bair1 Pitch Video",
    description:
      "Two-minute overview covering the problem, product, architecture, and business model.",
    src: "/encodehack/bair1-pitch-video.mp4",
    duration: "2:13",
  },
  {
    title: "Bair1 Hardware Demo",
    description:
      "Short hardware demo showing the Bair1 device and build process footage.",
    src: "/encodehack/bair1-demo-video.mp4",
    duration: "1:16",
  },
];

export default function EncodeHackPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <nav className="border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/bear-logo.png"
              alt="Bair1"
              width={36}
              height={36}
              className="object-contain"
            />
            <span
              className="text-xl font-bold tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bair<span className="text-primary">1</span>
            </span>
          </Link>
          <Link
            href="https://github.com/Hey-Salad/bair1"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-ink"
          >
            GitHub
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Encode Hackathon
          </p>
          <h1 className="mb-6 text-ink">Bair1 submission videos</h1>
          <p className="prose-cap text-lg leading-relaxed text-muted">
            Bair1 is a bear-shaped air quality sensor with a live web dashboard,
            mobile app, and cloud ingestion pipeline. These videos are prepared
            for judges, partners, and hackathon submission review.
          </p>
        </div>

        <div className="mt-12 grid gap-8">
          {videos.map((video) => (
            <article
              key={video.src}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="aspect-video bg-black">
                <video
                  controls
                  preload="metadata"
                  className="h-full w-full"
                  poster="/bear-sensor-front.jpg"
                >
                  <source src={video.src} type="video/mp4" />
                </video>
              </div>
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="mb-2 text-2xl text-ink">{video.title}</h2>
                  <p className="max-w-3xl text-muted">{video.description}</p>
                  <p className="mt-2 text-sm font-semibold text-primary">
                    Duration: {video.duration}
                  </p>
                </div>
                <a
                  href={video.src}
                  className="shrink-0 rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Open MP4
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-3 text-2xl text-ink">Submission links</h2>
          <div className="grid gap-3 text-muted sm:grid-cols-2">
            <a className="hover:text-ink" href="/encodehack/bair1-pitch-video.mp4">
              /encodehack/bair1-pitch-video.mp4
            </a>
            <a className="hover:text-ink" href="/encodehack/bair1-demo-video.mp4">
              /encodehack/bair1-demo-video.mp4
            </a>
            <a className="hover:text-ink" href="https://bair1.live">
              https://bair1.live
            </a>
            <a className="hover:text-ink" href="https://github.com/Hey-Salad/bair1">
              https://github.com/Hey-Salad/bair1
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
