# ACORN2PROTEIN Backend

Node.js / Express / MongoDB backend for the ACORN2PROTEIN mealworm farming monitoring prototype. It connects the ESP32 device, MongoDB, the FastAPI computer vision service and the Next.js dashboard.

## Quick start

```bash
cp .env.example .env        # then set real secrets (min. 16 chars)
npm install
npm run dev                 # node --watch
curl http://localhost:4000/api/v1/health
```

MongoDB must be running at `MONGODB_URI`. With Docker:

```bash
docker run -d --name a2p-mongo -p 27017:27017 mongo:7
```

## Architecture (MVC + services)

| Layer | Responsibility |
|---|---|
| `routes/` | Map URL + method to middleware chain and a controller. No logic. |
| `middlewares/` | Cross-cutting concerns: auth, device auth, validation, errors. |
| `controllers/` | Thin. Read the request, call one service, send an `ApiResponse`. |
| `services/` | All business logic (telemetry, alert rules, analytics, FastAPI client). |
| `models/` | Mongoose schemas, indexes, validation. |
| `validators/` | Zod schemas for request bodies, queries and params. |
| `config/` | Environment validation, DB connection, Socket.IO setup. |
| `utils/` | `ApiError`, `ApiResponse`, `asyncHandler`, logger, token helpers. |

## Response format

Success: `{ "success": true, "message": "...", "data": ..., "meta"?: {...} }`

Error: `{ "success": false, "message": "...", "code": "...", "details"?: ... }`

## Status

- [x] Phase 1: project setup, config, DB, Express app, error handling, health endpoint
- [ ] Phase 2: auth, devices, trays, device authentication
- [x] Phase 3: telemetry and alerts (device API keys, `POST /telemetry`, alerts with dedup/hysteresis, offline monitor, simulator). See [docs/device-protocol.md](../docs/device-protocol.md)
- [ ] Phase 4: Socket.IO
- [ ] Phase 5: experiments, feed formulas, feeding events, observations
- [~] Phase 6: FastAPI integration (images + analysis done early for the hackathon; Socket.IO event pending Phase 4)
- [ ] Phase 7: analytics and Swagger

## Images and computer vision

Requires the vision service (`../vision`) running at `FASTAPI_BASE_URL`.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/images` | multipart `image` (jpeg/png/webp, ≤ `UPLOAD_MAX_MB`), optional `trayCode`, `source` (`camera`, `manual_upload`, `sample_dataset`), `capturedAt` |
| GET | `/api/v1/images` | paginated, `?trayCode=&page=&limit=` |
| GET | `/api/v1/images/:id` | metadata + latest analysis |
| GET | `/api/v1/images/:id/file` | original image |
| POST | `/api/v1/images/:id/analyze` | 202, runs in the background (polls FastAPI, 2 min timeout) |
| GET | `/api/v1/images/:id/analysis` | `pending` / `processing` / `completed` / `failed` with results |
| GET | `/api/v1/images/:id/analysis/annotated` | JPEG with outlined larvae |

Notes: routes are unauthenticated until Phase 2. Images reference trays by `trayCode` (default `DEMO_TRAY`)
until the Tray model exists. `sample_dataset` marks printed/public dataset images so they are never mixed with
live tray data. `/health` reports `vision: up|down` without degrading the API.
