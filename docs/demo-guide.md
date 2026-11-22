# Demo guide (3 minutes)

What to show, in order. Open the dashboard at `http://localhost:3000`.

## 1. The idea (30 s)

Show the acorn infographic in the README: cork-oak acorns → detannified acorn flour → mealworms → protein feed and
frass fertiliser. LarvaLoop is the farm-side system that keeps the larvae healthy and measures their growth.

## 2. Live tray (60 s) · Telemetry page

- Point at the **Online** banner and the five live tiles: data from the real ESP32 every 5 s.
- **Warm the DHT22 with your hand.** At 28 °C the vent servo opens and the tile turns yellow; at 30 °C the buzzer
  starts, the tile turns red and a **critical temperature alert** appears (sidebar badge +1).
- Let it cool: the alert **closes by itself** below 27 °C.
- Optional: unplug the ESP32. After 30 s the banner turns **Offline** and a device-offline alert appears.

## 3. AI larvae measurement (60 s) · Vision page

- Start the camera, hold a **printed sample sheet** under it (black square visible), click **Capture & analyse**.
- In 3–15 s: every larva outlined and numbered, the **count**, **median length in mm**, confidence, and a
  per-larva table.
- Say it plainly: the sheets are photos from public datasets because we had no live larvae at the hackathon, and
  the app labels them as sample.

## 4. The trial and what comes next (30 s) · Analytics

- Top section is **live**: the real tray's last 24 h (mean temperature, humidity, time in safe range).
- Below, **sample** curves show how the trial will be read: growth, survival and **FCR** per diet (0 %, 15 %,
  30 % acorn flour).
- Next steps: login, live push (Socket.IO), real trial data, a model trained on our own trays.

## If something goes wrong

| Symptom | Fix |
|---|---|
| Telemetry shows Offline | ESP32 powered? Same Wi-Fi as the PC? PC IP matches the firmware's `SERVER_URL`? |
| ESP32 serial shows `401` | Device key missing from `dashboard/.env.local` (`LEGACY_DEVICE_KEYS`) |
| Vision says unavailable | Start the vision service; it needs internet |
| No data at all | Backend and MongoDB running? (Overview → Backend status) |
