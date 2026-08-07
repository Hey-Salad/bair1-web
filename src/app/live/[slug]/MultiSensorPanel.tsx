"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PublicFeedSnapshot } from "@/lib/public-feeds";

type Props = {
  snapshot: PublicFeedSnapshot;
};

function formatTime(value: string | number | Date) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmt(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

type EnvPoint = {
  time: number;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
};

type ImuPoint = {
  time: number;
  accelMag: number | null;
  gyroMag: number | null;
};

export default function MultiSensorPanel({ snapshot }: Props) {
  // Only render if any device reports extended sensor data.
  const hasEnv = snapshot.readings.some(
    (r) => r.temperature != null || r.pressure != null || r.humidity != null,
  );
  const hasImu = snapshot.readings.some(
    (r) => r.accelX != null || r.gyroX != null,
  );
  const hasBattery = snapshot.readings.some((r) => r.batteryVoltage != null);

  const latest = snapshot.readings.at(-1);
  const latestDht = snapshot.readings.find((r) => r.dhtTemp != null);

  // Build env chart data (temp/humidity/pressure over time)
  const envData = useMemo<EnvPoint[]>(() => {
    return snapshot.readings
      .filter((r) => r.temperature != null || r.humidity != null || r.pressure != null)
      .map((r) => ({
        time: new Date(r.timestamp).getTime(),
        temperature: r.temperature,
        humidity: r.humidity,
        pressure: r.pressure,
      }))
      .sort((a, b) => a.time - b.time);
  }, [snapshot.readings]);

  // Build IMU chart data (accel/gyro magnitude)
  const imuData = useMemo<ImuPoint[]>(() => {
    return snapshot.readings
      .filter((r) => r.accelX != null || r.gyroX != null)
      .map((r) => {
        const aMag =
          r.accelX != null && r.accelY != null && r.accelZ != null
            ? Math.sqrt(r.accelX ** 2 + r.accelY ** 2 + r.accelZ ** 2)
            : null;
        const gMag =
          r.gyroX != null && r.gyroY != null && r.gyroZ != null
            ? Math.sqrt(r.gyroX ** 2 + r.gyroY ** 2 + r.gyroZ ** 2)
            : null;
        return { time: new Date(r.timestamp).getTime(), accelMag: aMag, gyroMag: gMag };
      })
      .sort((a, b) => a.time - b.time);
  }, [snapshot.readings]);

  if (!hasEnv && !hasImu && !hasBattery) return null;

  return (
    <section className="mt-8 border border-border bg-surface">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">Multi-sensor panel</h2>
        <p className="mt-1 text-xs text-muted">
          BME280 · LSM6DS3 · DHT11 · battery — from the Genesis Mini board
        </p>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
        {/* BME280 stats */}
        {hasEnv ? (
          <>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">BME280 temperature</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.temperature)}</span>
                <span className="pb-1 text-sm text-muted">°C</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">BME280 humidity</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.humidity)}</span>
                <span className="pb-1 text-sm text-muted">%RH</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">BME280 pressure</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.pressure)}</span>
                <span className="pb-1 text-sm text-muted">hPa</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">DHT11 (sanity)</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latestDht?.dhtTemp)}</span>
                <span className="pb-1 text-sm text-muted">°C</span>
                <span className="ml-2 pb-1 text-sm text-muted">
                  {fmt(latestDht?.dhtHum)}%
                </span>
              </div>
            </div>
          </>
        ) : null}

        {/* IMU stats */}
        {hasImu ? (
          <>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">LSM6DS3 accel X</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.accelX, 2)}</span>
                <span className="pb-1 text-sm text-muted">m/s²</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">LSM6DS3 accel Y</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.accelY, 2)}</span>
                <span className="pb-1 text-sm text-muted">m/s²</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">LSM6DS3 accel Z</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">{fmt(latest?.accelZ, 2)}</span>
                <span className="pb-1 text-sm text-muted">m/s²</span>
              </div>
            </div>
            <div className="bg-surface p-4">
              <p className="text-sm text-muted">LSM6DS3 gyro mag</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-semibold">
                  {fmt(
                    latest?.gyroX != null && latest?.gyroY != null && latest?.gyroZ != null
                      ? Math.sqrt(latest.gyroX ** 2 + latest.gyroY ** 2 + latest.gyroZ ** 2)
                      : null,
                    2,
                  )}
                </span>
                <span className="pb-1 text-sm text-muted">rad/s</span>
              </div>
            </div>
          </>
        ) : null}

        {/* Battery + device stats */}
        {hasBattery ? (
          <div className="bg-surface p-4">
            <p className="text-sm text-muted">Battery</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-semibold">{fmt(latest?.batteryVoltage, 2)}</span>
              <span className="pb-1 text-sm text-muted">V</span>
              <span className="ml-2 pb-1 text-sm text-muted">
                {fmt(latest?.batteryLevel, 0)}%
              </span>
            </div>
          </div>
        ) : null}
        <div className="bg-surface p-4">
          <p className="text-sm text-muted">RSSI</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-semibold">{fmt(latest?.rssi, 0)}</span>
            <span className="pb-1 text-sm text-muted">dBm</span>
          </div>
        </div>
        <div className="bg-surface p-4">
          <p className="text-sm text-muted">Uptime</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-semibold">
              {latest?.uptimeMs != null ? (latest.uptimeMs / 1000).toFixed(0) : "--"}
            </span>
            <span className="pb-1 text-sm text-muted">s</span>
          </div>
        </div>
      </div>

      {/* Env chart */}
      {hasEnv && envData.length > 1 ? (
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs text-muted">Temperature · humidity · pressure (last 30 min)</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envData} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={formatTime}
                  minTickGap={28}
                  tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="temp"
                  domain={[0, "dataMax + 5"]}
                  tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                  width={46}
                />
                <YAxis
                  yAxisId="hum"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.32)", strokeWidth: 1 }}
                  labelFormatter={(value) => formatTime(value as number)}
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="BME280 °C"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="hum"
                  type="monotone"
                  dataKey="humidity"
                  name="BME280 %RH"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="pressure"
                  name="BME280 hPa"
                  stroke="#a3e635"
                  strokeWidth={1.6}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* IMU chart */}
      {hasImu && imuData.length > 1 ? (
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs text-muted">LSM6DS3 motion (accel + gyro magnitude)</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={imuData} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={formatTime}
                  minTickGap={28}
                  tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, "dataMax + 1"]}
                  tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
                  width={46}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.32)", strokeWidth: 1 }}
                  labelFormatter={(value) => formatTime(value as number)}
                />
                <Line
                  type="monotone"
                  dataKey="accelMag"
                  name="|accel| m/s²"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="gyroMag"
                  name="|gyro| rad/s"
                  stroke="#a855f7"
                  strokeWidth={1.8}
                  strokeDasharray="4 5"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
