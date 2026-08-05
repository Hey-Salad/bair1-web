"use client";

import { useEffect, useState } from "react";

type Props = {
  deviceId: string;
  apiKey: string | null;
};

type CommandStatus = {
  commandId: string;
  type: string;
  status: "pending" | "done";
  result: { ok?: boolean } | null;
} | null;

export default function DeviceControlCard({ deviceId, apiKey }: Props) {
  const [ledOn, setLedOn] = useState(false);
  const [brightness, setBrightness] = useState(128);
  const [lastStatus, setLastStatus] = useState<string>("idle");
  const [pendingCommand, setPendingCommand] = useState<CommandStatus>(null);
  const [polling, setPolling] = useState(false);

  // Fetch initial state on mount
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    const loadState = async () => {
      try {
        const res = await fetch(`/api/v1/devices/${deviceId}/state`, {
          headers: { "x-api-key": apiKey },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.led) {
          setLedOn(Boolean(data.led.on));
          setBrightness(Number(data.led.brightness) || 0);
        }
      } catch { /* ignore */ }
    };
    loadState();
    return () => { cancelled = true; };
  }, [deviceId, apiKey]);

  // Poll a command until done (or timeout)
  useEffect(() => {
    if (!pendingCommand || !apiKey) return;
    let cancelled = false;
    setPolling(true);
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/devices/${deviceId}/commands/${pendingCommand.commandId}`, {
          headers: { "x-api-key": apiKey },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.command) {
          if (data.command.status === "done") {
            setPendingCommand(null);
            setLastStatus(`acked: ${data.command.result?.ok ? "ok" : "err"}`);
            window.clearInterval(id);
            setPolling(false);
            // Refresh LED state from server if it was a set_led command
            if (data.command.type === "set_led") {
              setLedOn(Boolean(data.command.result?.led?.on));
              setBrightness(Number(data.command.result?.led?.brightness) ?? brightness);
            }
          }
        }
      } catch { /* ignore */ }
    }, 1500);
    // Safety: stop polling after 30s
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setPendingCommand(null);
        setLastStatus("timeout (device offline?)");
        setPolling(false);
        window.clearInterval(id);
      }
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(timeout);
      setPolling(false);
    };
  }, [pendingCommand, deviceId, apiKey, brightness]);

  const sendCommand = async (type: string, payload?: Record<string, unknown>) => {
    if (!apiKey) {
      setLastStatus("missing API key");
      return;
    }
    setLastStatus("sending...");
    try {
      const res = await fetch(`/api/v1/devices/${deviceId}/commands`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      if (!res.ok) {
        setLastStatus(`error ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data?.commandId) {
        setPendingCommand({ commandId: data.commandId, type, status: "pending", result: null });
        setLastStatus("pending ack...");
      } else {
        setLastStatus("no commandId returned");
      }
    } catch {
      setLastStatus("network error");
    }
  };

  const handleToggle = () => {
    const next = !ledOn;
    setLedOn(next);
    sendCommand("set_led", { on: next, brightness });
  };

  const handleBrightness = (value: number) => {
    setBrightness(value);
    // Debounce: only send when user releases (use onChange committed via onMouseUp/onBlur)
  };

  const commitBrightness = () => {
    sendCommand("set_led", { on: ledOn, brightness });
  };

  const disabled = !apiKey || polling;

  return (
    <section className="border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Device control</h3>
        <span className="text-xs text-muted">{deviceId}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Cloud commands — device polls within 5s when online.
      </p>
      {!apiKey ? (
        <p className="mt-3 text-xs text-muted">
          Sign in and add an API key to control this device.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="led-toggle" className="text-sm text-ink">LED</label>
            <button
              id="led-toggle"
              type="button"
              role="switch"
              aria-checked={ledOn}
              disabled={disabled}
              onClick={handleToggle}
              className={`h-7 w-12 rounded-full border border-border transition ${ledOn ? "bg-primary" : "bg-bg"} disabled:opacity-50`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-surface transition ${ledOn ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
          <div>
            <label htmlFor="brightness" className="text-sm text-ink">
              Brightness <span className="text-muted">{brightness}</span>
            </label>
            <input
              id="brightness"
              type="range"
              min={0}
              max={255}
              value={brightness}
              disabled={disabled}
              onChange={(e) => handleBrightness(Number(e.target.value))}
              onMouseUp={commitBrightness}
              onKeyUp={commitBrightness}
              className="mt-2 w-full accent-primary disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => sendCommand("read_sps30")}
              className="flex-1 border border-border bg-bg px-3 py-2 text-xs text-ink transition hover:border-primary disabled:opacity-50"
            >
              Force read
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => sendCommand("clean_sps30")}
              className="flex-1 border border-border bg-bg px-3 py-2 text-xs text-ink transition hover:border-primary disabled:opacity-50"
            >
              Clean fan
            </button>
          </div>
          <p className="text-xs text-muted">Status: <span className="text-ink">{lastStatus}</span></p>
        </div>
      )}
    </section>
  );
}
