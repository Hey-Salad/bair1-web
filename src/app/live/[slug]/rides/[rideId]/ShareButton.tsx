"use client";

import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type ShareResult = { token: string; url: string; fuzzMetres: number };

/**
 * Creates an unlisted share link for one ride.
 *
 * Blurring is on by default and the control says what it does in plain terms —
 * a route that starts at your front door is the thing people forget they are
 * publishing, so turning it off has to be a deliberate act, not an unnoticed
 * default.
 */
export default function ShareButton({
  deviceId,
  rideId,
}: {
  deviceId: string;
  rideId: string;
}) {
  // The share API authenticates a Bearer token (it has no cookie session),
  // so the browser must present one exactly the way the dashboard does.
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const [blur, setBlur] = useState(true);
  const [share, setShare] = useState<ShareResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const endpoint = `/api/v1/devices/${encodeURIComponent(deviceId)}/rides/${encodeURIComponent(rideId)}/share`;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fuzzMetres: blur ? 500 : 0 }),
      });
      if (res.status === 401 || res.status === 404) {
        setError("This device belongs to another account, so it can't be shared from here.");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not create the link.");
        return;
      }
      setShare(json.data);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!share) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${endpoint}?token=${encodeURIComponent(share.token)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Could not revoke the link.");
        return;
      }
      setShare(null);
      setCopied(false);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the link and copy it manually.");
    }
  }

  const btn =
    "rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  if (share) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">
            Share link created
          </h3>
          <button onClick={revoke} disabled={busy}
            className={`${btn} border border-border text-muted hover:text-ink`}>
            Revoke
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-ink">
            {share.url}
          </code>
          <button onClick={copy} className={`${btn} bg-primary text-bg font-semibold`}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-sm text-muted">
          {share.fuzzMetres > 0
            ? `Anyone with this link can see the route and its air quality. Start and end are shown to roughly ${share.fuzzMetres} m, so it does not reveal a precise address.`
            : "Anyone with this link can see the exact route, including where it starts and ends."}{" "}
          It is unlisted and not indexed by search engines. Revoking takes effect immediately.
        </p>
        {error && <p className="text-sm text-aqi-orange">{error}</p>}
      </div>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">Share this ride</h3>
          <p className="mt-1 text-sm text-muted">Sign in to create a link you can send to someone.</p>
        </div>
        <button
          onClick={() => loginWithRedirect({ appState: { returnTo: window.location.pathname + window.location.search } })}
          className={`${btn} bg-primary text-bg font-semibold`}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.13em] text-muted">Share this ride</h3>
        <button onClick={create} disabled={busy || isLoading} className={`${btn} bg-primary text-bg font-semibold`}>
          {busy ? "Creating…" : "Create link"}
        </button>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={blur}
          onChange={(e) => setBlur(e.target.checked)}
          className="mt-1 accent-[var(--color-primary)]"
        />
        <span>
          <span className="text-ink">Blur where the ride starts and ends</span> — shows both ends to
          roughly 500 m. Leave this on if the ride begins at home.
        </span>
      </label>
      {error && <p className="text-sm text-aqi-orange">{error}</p>}
    </div>
  );
}
