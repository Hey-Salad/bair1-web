"use client";

import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

/**
 * Hide a journey from the public lists.
 *
 * Nothing is deleted — journeys are derived from readings, and the readings
 * stay. This records an exclusion, so it is always reversible, and the copy
 * says so rather than implying the data is gone.
 */
export default function HideButton({
  deviceId,
  rideId,
  hidden,
}: {
  deviceId: string;
  rideId: string;
  hidden: boolean;
}) {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !isAuthenticated) return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(
        `/api/v1/devices/${encodeURIComponent(deviceId)}/rides/${encodeURIComponent(rideId)}/hide`,
        { method: hidden ? "DELETE" : "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Could not update this journey.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <h3 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">
          {hidden ? "Hidden journey" : "Hide this journey"}
        </h3>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          {hidden
            ? "This journey is excluded from the journeys map and the rides list. Its readings are untouched."
            : "Removes it from the journeys map and rides list. Nothing is deleted — the readings stay, and you can undo this at any time."}
        </p>
        {error && <p className="mt-1 text-sm text-aqi-orange">{error}</p>}
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={
          "rounded-lg border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider " +
          "text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        }
      >
        {busy ? "Saving…" : hidden ? "Unhide" : "Hide"}
      </button>
    </div>
  );
}
