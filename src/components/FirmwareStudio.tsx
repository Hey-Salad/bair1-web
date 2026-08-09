"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Device } from "@/lib/devices";

interface FirmwareStudioProps {
  devices: Device[];
  authHeaders: () => Promise<Record<string, string>>;
}

interface DeviceState {
  led: { on: boolean; brightness: number; mode: string; manualColor: number };
  lastSeenAt: string | null;
}

interface DeviceFirmwareMeta {
  currentVersion: string | null;
  targetVersion: string | null;
  sha256: string | null;
  uploadedAt: string | null;
  lastSeenAt: string | null;
}

interface CommandRecord {
  commandId: string;
  type: string;
  status: "pending" | "done";
  createdAt: string;
  result: Record<string, unknown> | null;
}

interface LiveReading {
  aqi: number | null;
  pm1: number | null;
  pm25: number | null;
  pm4: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  dhtTemp: number | null;
  dhtHum: number | null;
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
  gyroX: number | null;
  gyroY: number | null;
  gyroZ: number | null;
  batteryVoltage: number | null;
  batteryLevel: number | null;
  rssi: number | null;
  uptimeMs: number | null;
  firmwareVersion: string | null;
  transport: string | null;
  airState: string | null;
  sensorModel: string | null;
  board: string | null;
  timestamp: string | null;
}

const COLOR_PRESETS: { label: string; value: string; hex: string }[] = [
  { label: "Red", value: "red", hex: "#FF0000" },
  { label: "Green", value: "green", hex: "#00FF00" },
  { label: "Blue", value: "blue", hex: "#0000FF" },
  { label: "White", value: "white", hex: "#FFFFFF" },
  { label: "Off", value: "off", hex: "#000000" },
];

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

function fmt(v: number | null | undefined, digits = 1, unit = ""): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}${unit}`;
}

function fmtUptime(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ---------- Icons (inline SVG, no dependency) ----------
function Icon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    cpu: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
    wifi: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>,
    battery: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="8" width="16" height="10" rx="1"/><path d="M22 11v6"/><rect x="4" y="10" width="12" height="6" fill="currentColor" stroke="none" opacity="0.3"/></svg>,
    upload: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    clock: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    lightbulb: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z"/></svg>,
    volume: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
    refresh: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    chip: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
    thermometer: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4 4 0 1 0 5 0z"/></svg>,
    droplet: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
    gauge: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14a4 4 0 1 0-4-4"/><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>,
    activity: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    zap: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    command: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    checkCircle: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    pending: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };
  return <span className="inline-flex">{icons[name] ?? null}</span>;
}

function StatCard({ icon, label, value, sub, accent }: { icon?: string; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <Icon name={icon} className="w-3 h-3 text-muted/50" />}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${accent ?? "text-ink"}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted/60">{sub}</div>}
    </div>
  );
}

export default function FirmwareStudio({ devices, authHeaders }: FirmwareStudioProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [state, setState] = useState<DeviceState | null>(null);
  const [firmware, setFirmware] = useState<DeviceFirmwareMeta | null>(null);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Default-select the first device when the list loads.
  useEffect(() => {
    if (!selectedDeviceId && devices.length > 0) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  }, [devices, selectedDeviceId]);

  const loadDevice = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    try {
      const headers = await authHeaders();
      const [stateRes, firmwareRes, commandsRes, readingRes] = await Promise.all([
        fetch(`/api/v1/devices/${encodeURIComponent(deviceId)}/state`, { headers }),
        fetch(`/api/v1/devices/${encodeURIComponent(deviceId)}/firmware`, { headers }),
        fetch(`/api/v1/devices/${encodeURIComponent(deviceId)}/commands?limit=10`, { headers }),
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{ latestReading(deviceId: "${deviceId}") { aqi pm1 pm25 pm4 pm10 temperature humidity pressure dhtTemp dhtHum accelX accelY accelZ gyroX gyroY gyroZ batteryVoltage batteryLevel rssi uptimeMs firmwareVersion transport airState sensorModel board timestamp } }`,
          }),
        }),
      ]);
      const stateData = await parseJson<{ led: DeviceState["led"]; lastSeenAt: string | null }>(stateRes);
      const firmwareData = await parseJson<DeviceFirmwareMeta>(firmwareRes);
      const commandsData = await parseJson<{ commands: CommandRecord[] }>(commandsRes);
      const readingData = await readingRes.json().catch(() => ({}));
      setState({ led: stateData.led, lastSeenAt: stateData.lastSeenAt });
      setFirmware(firmwareData);
      setCommands(commandsData.commands ?? []);
      setReading(readingData?.data?.latestReading ?? null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to load device");
    }
  }, [authHeaders]);

  useEffect(() => {
    if (selectedDeviceId) void loadDevice(selectedDeviceId);
  }, [selectedDeviceId, loadDevice]);

  // Poll for live reading + command status every 10s.
  useEffect(() => {
    if (!selectedDeviceId) return;
    const interval = setInterval(() => {
      void loadDevice(selectedDeviceId);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedDeviceId, loadDevice]);

  // Poll for command status while a deploy is pending.
  useEffect(() => {
    if (!polling || !selectedDeviceId) return;
    pollRef.current = setInterval(() => {
      void loadDevice(selectedDeviceId);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, selectedDeviceId, loadDevice]);

  // Stop polling once the latest ota_update command is done.
  useEffect(() => {
    if (!polling) return;
    const latestOta = commands.find((c) => c.type === "ota_update");
    if (latestOta && latestOta.status === "done") {
      setPolling(false);
      setStatus(`OTA complete: ${latestOta.result?.ok ? "success" : "failed"}`);
    }
  }, [commands, polling]);

  async function sendLedCommand(payload: Record<string, unknown>) {
    if (!selectedDeviceId) return;
    setStatus(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/v1/devices/${encodeURIComponent(selectedDeviceId)}/commands`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "set_led", payload }),
      });
      await parseJson<{ commandId: string }>(res);
      setTimeout(() => void loadDevice(selectedDeviceId), 1500);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "LED command failed");
    }
  }

  async function sendBuzzerCommand(ms: number, freq: number) {
    if (!selectedDeviceId) return;
    setStatus(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/v1/devices/${encodeURIComponent(selectedDeviceId)}/commands`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "beep", payload: { ms, freq } }),
      });
      await parseJson<{ commandId: string }>(res);
      setTimeout(() => void loadDevice(selectedDeviceId), 1500);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Buzzer command failed");
    }
  }

  async function uploadAndDeploy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeviceId || !file || !version.trim()) {
      setStatus("Select a device, choose a .bin file, and enter a version");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const headers = await authHeaders();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("version", version.trim());
      const uploadHeaders: Record<string, string> = { Authorization: headers.Authorization };
      const uploadRes = await fetch(
        `/api/v1/devices/${encodeURIComponent(selectedDeviceId)}/firmware`,
        { method: "POST", headers: uploadHeaders, body: formData },
      );
      const uploadData = await parseJson<{ ok: boolean; version: string; sha256: string }>(uploadRes);
      setStatus(`Uploaded ${uploadData.version} (sha256: ${uploadData.sha256.slice(0, 12)}…). Deploying…`);
      const deployRes = await fetch(
        `/api/v1/devices/${encodeURIComponent(selectedDeviceId)}/deploy`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ version: uploadData.version }),
        },
      );
      const deployData = await parseJson<{ commandId: string }>(deployRes);
      setStatus(`Deploying — command ${deployData.commandId}. Device will beep + reboot when done.`);
      setPolling(true);
      setFile(null);
      setVersion("");
      void loadDevice(selectedDeviceId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload/deploy failed");
    } finally {
      setBusy(false);
    }
  }

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (f) {
      setFile(f);
      if (!version.trim()) {
        const base = f.name.replace(/\.bin$/i, "").replace(/[^a-z0-9._-]/gi, "-");
        setVersion(base || "bair1-genesis-v2.1");
      }
    }
  };

  const ledOn = state?.led.on ?? false;
  const ledBrightness = state?.led.brightness ?? 0;
  const ledMode = state?.led.mode ?? "aqi";
  const isLive = reading?.timestamp != null && (Date.now() - new Date(reading.timestamp).getTime()) < 60000;

  return (
    <section className="tab-content-enter px-4 pb-28 lg:px-0 lg:pb-8">
      {/* Header row — device picker + refresh (no duplicate "Developer platform" label) */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            isLive ? "bg-green-500/10 text-green-400" : "bg-muted/10 text-muted"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-muted/50"}`} />
            {isLive ? "Live" : "Offline"}
          </span>
          {reading?.firmwareVersion && (
            <span className="font-mono text-xs text-muted">{reading.firmwareVersion}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs font-medium text-ink"
          >
            {devices.length === 0 && <option value="">No devices</option>}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.name} ({d.deviceId})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadDevice(selectedDeviceId)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <Icon name="refresh" className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-4 rounded-lg border border-border bg-surface/70 px-4 py-3 text-sm text-muted">
          {status}
        </div>
      )}

      {/* Live sensor data — same as saddlesense02 live page */}
      {reading && (
        <div className="mb-4 rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="activity" className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold leading-tight text-ink">Live sensor data</h2>
            {reading.timestamp && (
              <span className="ml-auto text-[10px] text-muted/60">
                {new Date(reading.timestamp).toLocaleString()}
              </span>
            )}
          </div>

          {/* AQI + PM stats */}
          <div className="mb-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">Air Quality</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon="gauge" label="AQI" value={fmt(reading.aqi, 0)} accent="text-primary" />
              <StatCard label="PM1.0" value={fmt(reading.pm1, 1, " µg/m³")} />
              <StatCard label="PM2.5" value={fmt(reading.pm25, 1, " µg/m³")} accent="text-primary" />
              <StatCard label="PM4.0" value={fmt(reading.pm4, 1, " µg/m³")} />
              <StatCard label="PM10" value={fmt(reading.pm10, 1, " µg/m³")} />
            </div>
          </div>

          {/* BME280 + DHT11 */}
          <div className="mb-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">Environment</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard icon="thermometer" label="BME280 Temp" value={fmt(reading.temperature, 1, " °C")} />
              <StatCard icon="droplet" label="BME280 Hum" value={fmt(reading.humidity, 1, " %")} />
              <StatCard icon="gauge" label="BME280 Pres" value={fmt(reading.pressure, 1, " hPa")} />
              <StatCard icon="thermometer" label="DHT11 Temp" value={fmt(reading.dhtTemp, 1, " °C")} />
              <StatCard icon="droplet" label="DHT11 Hum" value={fmt(reading.dhtHum, 0, " %")} />
            </div>
          </div>

          {/* IMU + Battery + Connectivity */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">Motion & Connectivity</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Accel X" value={fmt(reading.accelX, 3, " g")} />
              <StatCard label="Accel Y" value={fmt(reading.accelY, 3, " g")} />
              <StatCard label="Accel Z" value={fmt(reading.accelZ, 3, " g")} />
              <StatCard icon="battery" label="Battery" value={fmt(reading.batteryVoltage, 2, " V")} sub={fmt(reading.batteryLevel, 0, "%")} />
              <StatCard icon="wifi" label="RSSI" value={fmt(reading.rssi, 0, " dBm")} />
              <StatCard icon="clock" label="Uptime" value={fmtUptime(reading.uptimeMs)} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Panel A — Firmware OTA Studio */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="chip" className="w-4 h-4 text-muted/60" />
              <h2 className="text-base font-semibold leading-tight text-ink">Device status</h2>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted">
                  <Icon name="cpu" className="w-3 h-3" /> Current firmware
                </dt>
                <dd className="mt-0.5 font-mono text-ink">{firmware?.currentVersion ?? "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted">
                  <Icon name="upload" className="w-3 h-3" /> Target firmware
                </dt>
                <dd className="mt-0.5 font-mono text-ink">{firmware?.targetVersion ?? "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted">
                  <Icon name="clock" className="w-3 h-3" /> Last seen
                </dt>
                <dd className="mt-0.5 text-ink">{firmware?.lastSeenAt ? new Date(firmware.lastSeenAt).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted">
                  <Icon name="upload" className="w-3 h-3" /> Uploaded at
                </dt>
                <dd className="mt-0.5 text-ink">{firmware?.uploadedAt ? new Date(firmware.uploadedAt).toLocaleString() : "—"}</dd>
              </div>
            </dl>
          </div>

          <form onSubmit={uploadAndDeploy} className="rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Icon name="upload" className="mt-0.5 w-4 h-4 text-primary" />
                <div>
                  <h2 className="text-base font-semibold leading-tight text-ink">Upload & deploy firmware</h2>
                  <p className="text-xs text-muted">Drop a .bin from <code className="font-mono">.pio/build/genesis_mini/firmware.bin</code>. The device beeps, downloads, and reboots.</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !file || !version.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                {busy ? "Deploying…" : "Upload & Deploy"}
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                .bin file
                <input
                  type="file"
                  accept=".bin"
                  onChange={onFileChange}
                  className="mt-2 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-border file:bg-bg file:px-3 file:py-2 file:text-xs file:font-medium file:text-ink"
                />
              </label>
              {file && (
                <p className="text-xs text-muted">
                  {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
              <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                Version label
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="bair1-genesis-v2.1"
                  className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-primary/70"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted">
              The device must be online within 15 minutes of deploy — the R2 download URL expires after that.
            </p>
          </form>

          <div className="rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="command" className="w-4 h-4 text-muted/60" />
              <h2 className="text-base font-semibold leading-tight text-ink">Command history</h2>
            </div>
            <div className="space-y-2">
              {commands.length === 0 && (
                <p className="rounded-lg border border-border bg-bg px-3 py-6 text-center text-sm text-muted">
                  No commands yet.
                </p>
              )}
              {commands.map((cmd) => (
                <div key={cmd.commandId} className="rounded-lg border border-border bg-bg px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        name={cmd.status === "done" ? "checkCircle" : "pending"}
                        className={cmd.status === "done" ? "w-3.5 h-3.5 text-green-400" : "w-3.5 h-3.5 text-amber-500"}
                      />
                      <span className="font-mono text-xs text-ink">{cmd.type}</span>
                    </div>
                    <span className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                      cmd.status === "done"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {cmd.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Icon name="clock" className="w-3 h-3" />
                    {new Date(cmd.createdAt).toLocaleString()}
                  </div>
                  {cmd.result && (
                    <pre className="mt-1 overflow-x-auto rounded bg-[#0B0C0A] p-2 text-[10px] text-white">
                      {JSON.stringify(cmd.result).slice(0, 200)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel B — LED Control + Buzzer */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="lightbulb" className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold leading-tight text-ink">LED ring control</h2>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Icon name="zap" className="w-3.5 h-3.5 text-muted/50" />
                Power
              </span>
              <button
                type="button"
                onClick={() => void sendLedCommand({ on: !ledOn, brightness: ledOn ? ledBrightness : 128 })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  ledOn
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "border border-border bg-bg text-muted hover:text-ink"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${ledOn ? "bg-white" : "bg-muted/30"}`} />
                {ledOn ? "On" : "Off"}
              </button>
            </div>

            <div className="py-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">Brightness</span>
                <span className="font-mono text-xs text-muted">{ledBrightness}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={ledBrightness}
                onChange={(e) => {
                  const b = Number(e.target.value);
                  void sendLedCommand({ on: true, brightness: b });
                }}
                className="w-full accent-primary"
              />
            </div>

            <div className="py-2">
              <div className="mb-2 text-sm font-medium text-ink">Mode</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void sendLedCommand({ on: true, brightness: ledBrightness || 128, mode: "aqi" })}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    ledMode === "aqi"
                      ? "bg-primary text-white"
                      : "border border-border bg-bg text-muted hover:text-ink"
                  }`}
                >
                  Follow AQI
                </button>
                <button
                  type="button"
                  onClick={() => void sendLedCommand({ on: true, brightness: ledBrightness || 128, mode: "manual" })}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    ledMode === "manual"
                      ? "bg-primary text-white"
                      : "border border-border bg-bg text-muted hover:text-ink"
                  }`}
                >
                  Manual color
                </button>
              </div>
            </div>

            <div className={`py-2 ${ledMode === "manual" ? "" : "opacity-50 pointer-events-none"}`}>
              <div className="mb-2 text-sm font-medium text-ink">Color presets</div>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => void sendLedCommand({ on: true, brightness: ledBrightness || 255, mode: "manual", color: preset.value })}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border bg-bg px-2 py-2 text-[11px] font-medium text-muted hover:text-ink"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: preset.hex }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-muted">
                Hex color
                <input
                  type="text"
                  placeholder="#FF0000"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                      void sendLedCommand({ on: true, brightness: ledBrightness || 255, mode: "manual", color: v });
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-primary/70"
                />
              </label>
            </div>

            <p className="mt-3 text-xs text-muted">
              Current: {ledOn ? "on" : "off"}, brightness {ledBrightness}, mode {ledMode}
              {ledMode === "manual" && ` (#${state?.led.manualColor.toString(16).padStart(6, "0")})`}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface/70 p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="volume" className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold leading-tight text-ink">Buzzer</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void sendBuzzerCommand(150, 2700)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                <Icon name="volume" className="w-3.5 h-3.5" />
                Test beep
              </button>
              <button
                type="button"
                onClick={() => void sendBuzzerCommand(200, 2700)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                <Icon name="volume" className="w-3.5 h-3.5" />
                Beep (200ms)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
