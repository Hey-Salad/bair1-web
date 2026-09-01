# Saddle Sense sensor data path

## Current hardware state

The Saddle Sense prototype has an external environmental sensor and an external
particulate air-quality sensor connected to Qwiic/I²C ports. There is currently
no host microcontroller in the assembly.

This wiring powers and connects the devices to the I²C bus, but it does not make
the Notecard poll them. The Notecard is an I²C peripheral that accepts JSON
requests from a host. In the standalone configuration it can provide its own
connectivity, location, motion, voltage, temperature, and Notehub sync features;
it cannot run the sensor drivers for arbitrary external Qwiic devices.

Consequently, particulate measurements should not be expected from the current
assembly. Environmental values previously seen in Bair1 must not be attributed
to the external BME280 until a host-generated event is verified in Notehub.

## Required architecture

```text
Particulate sensor ─┐
                    ├─ Qwiic / I²C ─→ host MCU ─→ Notecard ─→ Notehub ─→ Bair1
BME280 ─────────────┘                   reads       syncs       routes     displays
```

The existing prototype firmware direction uses a small ESP32-S3 host, but any
supported MCU capable of running both sensor drivers and the Blues Notecard
library can perform this role. A carrier with an integrated programmable host
is another valid implementation.

## Expected I²C devices

Confirm the exact sensor models before selecting firmware libraries or power
requirements. Current project candidates use these addresses:

| Device | Typical address | Notes |
| --- | --- | --- |
| Blues Notecard | `0x17` | I²C peripheral receiving host JSON requests |
| Bosch BME280 | `0x76` or `0x77` | Temperature, humidity, and pressure |
| Sensirion SPS30 | `0x69` | PM1, PM2.5, PM4, and PM10; requires a suitable 5 V supply |
| Plantower PMSA003I | `0x12` | Alternative particulate sensor; verify its power requirements |

The host firmware should scan the bus during bench testing, report detected
addresses without recording device identifiers, and fail clearly when a sensor
is absent or underpowered.

## Notehub payload contract

After reading the sensors, the host should add a Note containing the available
measurements. Bair1's Notehub ingress already accepts the following body shape:

```json
{
  "temperature": 21.5,
  "humidity": 48.2,
  "pressure": 101325,
  "pm1": 3.1,
  "pm25": 5.4,
  "pm4": 6.0,
  "pm10": 7.2,
  "sensorModel": "particulate-sensor-model",
  "board": "host-board-model",
  "firmwareVersion": "host-firmware-version"
}
```

Do not manufacture missing readings or substitute a local air-quality index for
a raw particulate measurement. Send `null` or omit a field when a sensor read
fails. Bair1 stores PM readings only when at least one PM or AQI value is present.

## Verification sequence

1. Confirm the host MCU and exact sensor models.
2. Verify sensor voltage requirements before powering the particulate sensor.
3. Run an I²C scan and confirm the expected addresses.
4. Read the BME280 and particulate sensor locally over serial.
5. Add one sensor Note to the Notecard and request a Notehub sync.
6. Confirm the Notehub event contains real PM and environmental fields.
7. Confirm the Notehub route succeeds and Bair1 displays the same values.

Never commit raw Notecard identifiers, precise coordinates, credentials,
Notehub secrets, or production event envelopes.
