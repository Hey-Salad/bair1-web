"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Logo from "@/components/Logo";
import BearOrb from "@/components/BearOrb";
import GuidanceStrip from "@/components/GuidanceStrip";
import PmStats from "@/components/PmStats";
import Navigation, { type Tab } from "@/components/Navigation";
import MapView from "@/components/MapView";
import HistoryView from "@/components/HistoryView";
import AlertsView from "@/components/AlertsView";
import AdminView from "@/components/AdminView";
import DataSourceBadge from "@/components/DataSourceBadge";
import { getAqiState } from "@/lib/aqi";

interface DeviceOption {
  deviceId: string;
  name: string;
}

const DEMO_DATA = {
  aqi: 42,
  pm25: 12.3,
  pm10: 28.7,
  location: "Shoreditch, London",
  lastUpdated: new Date(),
  sensorId: "64E83383EC74",
};

export default function Dashboard() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const signup = () =>
    login({ authorizationParams: { screen_hint: "signup" } });

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState(DEMO_DATA);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdatedText, setLastUpdatedText] = useState("Just now");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const aqiState = getAqiState(data.aqi);

  // Fetch registered devices for device selector
  useEffect(() => {
    async function fetchDevices() {
      try {
        const query = `{
          registeredDevices { deviceId name status }
          activeDeviceIds
        }`;
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const registered = json.data?.registeredDevices ?? [];
        const activeIds: string[] = json.data?.activeDeviceIds ?? [];

        // Merge: registered devices first, then any active-but-unregistered
        const deviceMap = new Map<string, DeviceOption>();
        for (const d of registered) {
          deviceMap.set(d.deviceId, { deviceId: d.deviceId, name: d.name });
        }
        for (const id of activeIds) {
          if (!deviceMap.has(id)) {
            deviceMap.set(id, { deviceId: id, name: `Sensor ${id.slice(-4)}` });
          }
        }

        const list = Array.from(deviceMap.values());
        setDevices(list);
        if (list.length > 0 && !selectedDevice) {
          setSelectedDevice(list[0].deviceId);
        }
      } catch {
        // silently fail
      }
    }
    fetchDevices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch live data from GraphQL for the selected device
  const fetchLive = useCallback(async () => {
    const deviceId = selectedDevice;
    if (!deviceId) return;

    try {
      const query = `{
        latestReading(deviceId: "${deviceId}") {
          deviceId timestamp aqi gasVoltage rssi airState
        }
      }`;
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const json = await res.json();
      const reading = json.data?.latestReading;
      if (reading?.aqi !== undefined) {
        setData({
          aqi: reading.aqi,
          pm25: reading.gasVoltage ?? 0,
          pm10: 0,
          location: "London",
          lastUpdated: new Date(reading.timestamp),
          sensorId: reading.deviceId,
        });
        setIsLive(true);
        setLastUpdatedText("Just now");
        return;
      }
      throw new Error("No reading");
    } catch {
      setIsLive(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Demo data simulation when not live
  useEffect(() => {
    if (isLive) return;
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        aqi: Math.max(0, Math.min(500, prev.aqi + Math.floor(Math.random() * 11 - 5))),
        pm25: Math.max(0, +(prev.pm25 + (Math.random() * 4 - 2)).toFixed(1)),
        pm10: Math.max(0, +(prev.pm10 + (Math.random() * 6 - 3)).toFixed(1)),
        lastUpdated: new Date(),
      }));
      setLastUpdatedText("Just now");
    }, 60000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Last updated text
  useEffect(() => {
    const tick = setInterval(() => {
      const secs = Math.floor((Date.now() - data.lastUpdated.getTime()) / 1000);
      if (secs < 60) setLastUpdatedText("Just now");
      else setLastUpdatedText(`${Math.floor(secs / 60)}m ago`);
    }, 10000);
    return () => clearInterval(tick);
  }, [data.lastUpdated]);

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Logo />
          <p className="text-sm text-muted mt-4">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Logo />
          <h1 className="text-2xl font-bold text-ink mt-6 mb-2">Your AI Air Bear</h1>
          <p className="text-sm text-muted mb-8">
            Sign in to meet your bear. Real-time air quality, honestly delivered.
          </p>
          {error && <p className="text-sm text-red-400 mb-4">Error: {error.message}</p>}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => login()}
              className="bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors text-sm"
            >
              Log in
            </button>
            <button
              onClick={signup}
              className="border border-border text-ink font-semibold px-6 py-3 rounded-lg hover:bg-surface transition-colors text-sm"
            >
              Sign up
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <a href="/"><Logo /></a>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium text-ink/70">{user?.name ?? data.location}</div>
              <div className="text-[10px] text-muted/60">{lastUpdatedText}</div>
            </div>
            <button
              onClick={logout}
              className="text-[10px] text-muted/60 hover:text-ink/70 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full pt-6">
        {tab === "home" && (
          <div className="tab-content-enter flex flex-col items-center gap-6 px-4 pb-28">
            {/* Device selector */}
            {devices.length > 1 && (
              <select
                value={selectedDevice ?? ""}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-ink w-full max-w-xs"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.name} ({d.deviceId.slice(-4)})
                  </option>
                ))}
              </select>
            )}

            <DataSourceBadge
              isLive={isLive}
              sensorId={data.sensorId}
              source="Simulated readings"
            />
            <BearOrb aqiState={aqiState} aqi={data.aqi} />
            <GuidanceStrip aqiState={aqiState} />
            <PmStats pm25={data.pm25} pm10={data.pm10} />

            <div className="w-full max-w-sm bg-surface border border-border rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-muted/60">
                {isLive
                  ? `Sensor ${data.sensorId.slice(-4)} · Bair1 Node`
                  : "No sensor connected · Showing demo data"}
              </div>
            </div>
          </div>
        )}

        {tab === "map" && <MapView />}
        {tab === "history" && <HistoryView deviceId={selectedDevice ?? undefined} />}
        {tab === "alerts" && <AlertsView />}
        {tab === "admin" && <AdminView />}
      </div>

      <Navigation active={tab} onChange={setTab} />
    </main>
  );
}
