# ESP32 → backend protocol

## Register the device (once)

```bash
npm run device:register -- ESP32_TRAY_01 TRAY_01 "ACORN2PROTEIN tray 1"
```

Prints the device's API key **once** (only a hash is stored). Running it again issues a new key and the old one stops working.

## Send a reading

`POST http://<PC LAN IP>:4000/api/v1/telemetry`, every 5 s (firmware `SEND_INTERVAL`).

Headers:

```
Content-Type: application/json
X-Device-Id: ESP32_TRAY_01
X-Api-Key: <key from device:register>
```

Body (exactly these fields; unknown fields are rejected):

```json
{
  "deviceId": "ESP32_TRAY_01",
  "trayCode": "TRAY_01",
  "temperature": 26.5,
  "humidity": 65.2,
  "flameDetected": false,
  "servoAngle": 0,
  "systemStatus": "NORMAL"
}
```

| Field | Type | Rule |
|---|---|---|
| `deviceId` | string | must equal the `X-Device-Id` header |
| `trayCode` | string | must be the tray the device was registered to |
| `temperature` | number or `null` | −40…80 °C. `null` when the DHT22 read fails (never resend an old value) |
| `humidity` | number or `null` | 0…100 %. Same rule |
| `flameDetected` | boolean | |
| `servoAngle` | integer | 0…180 |
| `systemStatus` | string | `NORMAL`, `WARNING`, `CRITICAL`, `FIRE_ALERT`, `SENSOR_ERROR` |
| `sequence` | integer, optional | increasing counter; a repeated value is acknowledged but not stored twice |
| `firmwareVersion` | string, optional | shown on the dashboard |

The server timestamps the reading (`recordedAt`); the ESP32 does not need a clock.

## Responses

| Status | Meaning |
|---|---|
| 201 | stored: `{"success":true,"data":{"deviceId":"…","recordedAt":"…"}}` |
| 200 | duplicate `sequence`, ignored |
| 400 | validation failed, `details` lists the fields |
| 401 | missing/invalid `X-Device-Id` / `X-Api-Key` |
| 403 | body `deviceId` differs from the header |
| 429 | more than `DEVICE_RATE_LIMIT_PER_MIN` (60) requests per minute |

## What the backend does with it

- Stores every reading (never overwritten), marks the device **online**.
- Alerts, one per ongoing condition (deduplicated), auto-resolved when it clears:

| Alert | Raised when | Resolves when |
|---|---|---|
| temperature (warning) | ≥ `TEMP_WARNING_C` (28) | < 27 (warning − 1 °C hysteresis) |
| temperature (critical) | ≥ `TEMP_CRITICAL_C` (30) | same |
| humidity (warning) | < 40 % or > 80 % | back inside 42–78 % |
| flame (critical) | `flameDetected: true` | `false` |
| sensor_error (warning) | temperature or humidity `null` | both present |
| device_offline (warning) | no reading for `DEVICE_OFFLINE_AFTER_S` (30 s) | next reading |

Thresholds are configurable in `.env`. The ESP32 keeps its own local safety logic (vent, buzzer, LED); the
backend never sends it commands, so the tray stays safe if Wi-Fi drops.

## Testing without hardware (synthetic data, separate device)

```bash
npm run device:register -- SIM_ESP32_01 SIM_TRAY "Simulator (synthetic data)"
SIM_API_KEY=<key> npm run simulate -- heat     # normal | heat | fire | sensor-error | humid
```

The simulator uses its own device and tray, and the dashboard labels it "Synthetic test data".

## Legacy firmware: `POST http://<PC>:3000/api/readings` (no auth headers)

The current tray firmware posts the same JSON to the **dashboard** port without `X-Device-Id`/`X-Api-Key`.
The dashboard's server-side route `dashboard/src/app/api/readings/route.ts` forwards it to
`/api/v1/telemetry` and adds the device key from `LEGACY_DEVICE_KEYS` in the dashboard's `.env.local`
(server-only, never sent to the browser). Responses are passed through unchanged.

Trade-off: on that route anyone on the same network can post as a listed device, so use a private network
(phone hotspot). New firmware should call the backend directly with its own key.
