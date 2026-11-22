# How LarvaLoop works: a page-by-page guide

This guide explains what every part of the dashboard shows, where the data comes from, and what to do with it.
Pages marked **live** show real data. Pages marked **sample** show illustrative values with a yellow banner.

## The physical tray

One rearing box with mealworm larvae, an **ESP32** board and these parts:

| Part | Job |
|---|---|
| DHT22 | Measures air temperature and humidity every 2.5 s |
| Flame sensor | Detects fire near the tray |
| SG90 servo | Opens a small ventilation flap at 28 °C, closes it below 27 °C, and closes it on fire (less oxygen) |
| Buzzer | Beeps when critical (≥ 30 °C) and fast on fire |
| RGB LED | Green normal · yellow warning · red critical or fire · blue sensor error |
| OLED screen | Shows temperature, humidity, status, flame, Wi-Fi and vent state |
| USB camera (on a PC) | Photographs the larvae from above for AI measurement |

Every 5 s the ESP32 sends a reading such as
`{"temperature": 26.5, "humidity": 65.2, "flameDetected": false, "servoAngle": 0, "systemStatus": "NORMAL"}`.

---

## Overview · live

The landing page.

- **Header:** project name and shortcuts to the live tray and to larvae measurement.
- **Temperature / Humidity cards:** the tray's latest reading and when it arrived. The temperature card turns
  yellow at 28 °C and red at 30 °C.
- **Open alerts:** how many problems are currently unresolved.
- **Devices online:** how many ESP32 boards sent data in the last 30 s.
- **Latest vision analysis:** the most recent AI result: annotated photo, larvae count, median length.
- **Open alerts list:** the three newest alerts.
- **Backend status:** whether the API, the database and the vision service are running.
- **Module cards:** shortcuts to every page, tagged *live* or *sample*.

## Telemetry · live

The live view of one tray.

- **Device tabs:** pick a board. The simulator (synthetic test data) is labelled *sim*.
- **Connection banner:** *Online* or *Offline*, and seconds since the last reading. Offline means no data for 30 s:
  check power and Wi-Fi.
- **Five tiles:** temperature, humidity, flame sensor, ventilation (servo angle) and the status the ESP32 reports.
  Each tile shows *OK*, *Check* or *Alert*.
- **Temperature chart:** readings over 15 min, 1 h or 6 h. Dashed lines mark the 28 °C warning and 30 °C critical
  thresholds. Gaps in the line mean the sensor failed or the device was offline. Hover to read exact values.
- **Humidity chart:** same, with the 40 % and 80 % limits.
- **Open alerts:** problems for this device, with *Acknowledge* (I've seen it) and *Resolve* (close it).

## Alerts · live

Every alert, filterable by *Open*, *Resolved* or *All*.

| Alert | Raised when | Closes by itself when |
|---|---|---|
| Temperature (warning) | ≥ 28 °C | below 27 °C |
| Temperature (critical) | ≥ 30 °C | below 27 °C |
| Humidity | below 40 % or above 80 % | back between 42 and 78 % |
| Flame | flame sensor triggered | flame gone |
| Sensor error | the DHT22 returned no value | values come back |
| Device offline | no reading for 30 s | the next reading arrives |

One alert per ongoing problem: a heat wave does not create hundreds of alerts. If it gets worse (warning →
critical) the same alert is escalated. The red number in the sidebar is the count of open alerts.

## Vision · live

Count and measure larvae from a photo.

- **Capture:** *Start camera* shows the USB camera; *Capture & analyse* sends the frame. *Upload photo* works too.
- **Printed sample sheet:** tick it when photographing our printed dataset photos (no live larvae at the
  hackathon). Those results are labelled *Sample sheet, not a live tray*.
- **Result:** the photo with every detected larva outlined and numbered, plus:
  - *Larvae detected*: the count (a lower bound: buried larvae are hidden).
  - *Median / mean length and range*: in mm, from the 20 mm black square in the frame. Without the square only
    pixel sizes are shown.
  - *Mean confidence*: how sure the model is, on average.
  - *Per-larva measurements*: length, width and confidence of each larva.
- **Recent images:** history; click one to reopen its result.

How the measurement works: [vision.md](vision.md).

## Devices · live

Each registered ESP32: online state, tray, time since last data, latest temperature and humidity, and a link to its
telemetry. Also shows the command to register a new board.

## Trays · sample

One card per rearing tray in the feeding trial: larvae alive out of the starting 500, biomass, survival, stage,
week, and the feed formula with its acorn-flour share.

## Experiments · sample

The acorn-flour substitution trial: objective, step-by-step method, progress through the 8 weeks, the three trays
and their diets. *Results* stay empty until the trial ends: conclusions are only written from real measurements.

## Feed formulas · sample

The three diets: control (wheat bran), 15 % and 30 % acorn flour. The bar shows the acorn-flour share.
*Nutritional* and *tannin* analysis show *pending lab*: a formula is never assumed safe before lab results.

## Feeding log · sample

Every feeding: date, tray, formula and grams, with totals per tray. Logged grams are what feed conversion is
computed from.

## Observations · sample

Weekly manual measurements: larvae count, biomass (from a weighed sample), mean larva mass, cumulative mortality,
development stage.

## Analytics · live + sample

- **Tray environment, last 24 h (live):** mean, min and max temperature and humidity of the real tray, the share of
  time inside safe conditions, and the number of readings.
- **Feeding trial (sample):** per tray, **FCR** (feed conversion ratio = feed given ÷ biomass gained; lower is
  better), biomass gain and survival, plus growth and survival curves. Each chart has a *Table* button.

---

## Behind the scenes

```
ESP32 ──► dashboard /api/readings ──► backend /api/v1/telemetry ──► MongoDB
                                            │  alerts, offline monitor
camera ──► dashboard ──► backend /images ──► vision service ──► Roboflow model
                                            │  count, length (mm), annotated image
dashboard ◄── polls every 3–5 s ◄───────────┘
```

- The ESP32 firmware posts to the dashboard's `/api/readings`, which adds the device's API key on the server and
  forwards to the backend. Devices can also call the backend directly with their own key.
- All readings are stored and never overwritten. Missing sensor values are stored as missing, never estimated.
