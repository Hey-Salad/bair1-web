"use client";

interface SensorData {
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
}

function fmt(v: number | null, digits = 1, unit = ""): string {
  if (v == null || !Number.isFinite(v)) return "--";
  return `${v.toFixed(digits)}${unit}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
      {sub && <div className="text-[10px] text-muted/60">{sub}</div>}
    </div>
  );
}

/**
 * Renders extended on-device sensor data: BME280 (T/H/P), DHT11 (T/H),
 * LSM6DS3 (accel/gyro), and battery. Only fields the device actually reports
 * are shown; absent sensors fall through to "--".
 */
export default function DeviceSensorPanel({ data }: { data: SensorData }) {
  const hasBme = data.temperature != null || data.humidity != null || data.pressure != null;
  const hasDht = data.dhtTemp != null || data.dhtHum != null;
  const hasImu = data.accelX != null || data.accelY != null || data.accelZ != null;
  const hasBatt = data.batteryVoltage != null || data.batteryLevel != null;

  if (!hasBme && !hasDht && !hasImu && !hasBatt) {
    return (
      <div className="bg-surface border border-border rounded-xl px-4 py-6 text-center text-sm text-muted">
        No extended sensor data from this device.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasBme && (
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">
            BME280 — Temp / Humidity / Pressure
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Temp" value={fmt(data.temperature, 1, "°C")} />
            <StatCard label="Humidity" value={fmt(data.humidity, 1, "%")} />
            <StatCard label="Pressure" value={fmt(data.pressure, 1, " hPa")} />
          </div>
        </div>
      )}

      {hasDht && (
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">
            DHT11 — Temp / Humidity
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="DHT Temp" value={fmt(data.dhtTemp, 1, "°C")} />
            <StatCard label="DHT Humidity" value={fmt(data.dhtHum, 1, "%")} />
          </div>
        </div>
      )}

      {hasImu && (
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">
            LSM6DS3 — Accelerometer / Gyroscope
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Accel X" value={fmt(data.accelX, 3, " g")} />
            <StatCard label="Accel Y" value={fmt(data.accelY, 3, " g")} />
            <StatCard label="Accel Z" value={fmt(data.accelZ, 3, " g")} />
            <StatCard label="Gyro X" value={fmt(data.gyroX, 3, " dps")} />
            <StatCard label="Gyro Y" value={fmt(data.gyroY, 3, " dps")} />
            <StatCard label="Gyro Z" value={fmt(data.gyroZ, 3, " dps")} />
          </div>
        </div>
      )}

      {hasBatt && (
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted/70 mb-1.5">
            Battery
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Voltage" value={fmt(data.batteryVoltage, 2, " V")} />
            <StatCard
              label="Level"
              value={data.batteryLevel != null ? `${data.batteryLevel}%` : "--"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
