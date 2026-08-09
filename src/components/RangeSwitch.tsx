"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RANGES, RETENTION_DAYS, type RangeKey } from "@/lib/time-range";

/**
 * Window selector shared by every view that shows readings, so "Live" means
 * the same thing on a chart, a ride list and an export.
 *
 * Links rather than buttons: the range lives in the URL, which makes a chosen
 * window shareable and survives a reload. Server components read it straight
 * off searchParams with no client state to sync.
 */
export default function RangeSwitch({
  active,
  /** Extra query params to preserve when switching (e.g. ?device=). */
  preserve = {},
  className = "",
}: {
  active: RangeKey;
  preserve?: Record<string, string | undefined>;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = (key: RangeKey) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.set("range", key);
    for (const [k, v] of Object.entries(preserve)) {
      if (v) next.set(k, v);
    }
    return `${pathname}?${next.toString()}`;
  };

  return (
    <nav
      aria-label="Time range"
      className={`flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1 ${className}`}
    >
      {RANGES.map((r) => {
        const isActive = r.key === active;
        return (
          <Link
            key={r.key}
            href={href(r.key)}
            aria-current={isActive ? "page" : undefined}
            title={
              r.key === "90d"
                ? `Readings are kept for ${RETENTION_DAYS} days`
                : `Show ${r.description}`
            }
            className={[
              "rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive
                ? "bg-primary text-bg font-semibold"
                : "text-muted hover:bg-border hover:text-ink",
            ].join(" ")}
          >
            {r.key === "live" && (
              <span
                aria-hidden
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                  isActive ? "bg-bg" : "bg-clean-air"
                }`}
              />
            )}
            {r.label}
          </Link>
        );
      })}
    </nav>
  );
}
