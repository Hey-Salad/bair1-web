import type { Metadata } from "next";
import Link from "next/link";
import DeviceSetup from "@/components/DeviceSetup";

export const metadata: Metadata = {
  title: "Device setup — Bair1",
  description: "Configure Bair1 Wi-Fi locally and inspect SD-card health over USB.",
};

export default function DeviceSetupPage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-ink">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bair1 hardware</p>
            <h1 className="mt-3">Set up your device</h1>
            <p className="mt-4 max-w-2xl text-muted">Configure connectivity and verify local storage without sending device credentials to the Bair1 cloud.</p>
          </div>
          <Link href="/firmware" className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink">Firmware</Link>
        </div>
        <DeviceSetup />
      </div>
    </main>
  );
}
