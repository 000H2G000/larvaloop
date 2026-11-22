# ACORN2PROTEIN Dashboard

Next.js dashboard for the ACORN2PROTEIN mealworm farming prototype. It talks to the
[backend](../backend) REST API (and, from backend Phase 4, Socket.IO).

## Quick start

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, default http://localhost:4000/api/v1
npm install
npm run dev                  # http://localhost:3000
```

The backend must be running, and its `CORS_ORIGIN` must include `http://localhost:3000`
(the default in the backend's `.env.example`).

## Structure

| Path | Responsibility |
|---|---|
| `src/app/` | Routes (App Router). `page.tsx` is the overview; `[module]/` is the placeholder for modules not built yet. |
| `src/components/` | UI components. `HealthPanel` is the only live-data component so far. |
| `src/lib/api.ts` | Fetch client. Unwraps the backend envelope `{ success, message, data, meta }` and throws `ApiError` with the backend `code`. |
| `src/lib/modules.ts` | Module registry mapped to backend.md §8: label, backend phase, endpoints, Socket.IO events. |
| `src/types/api.ts` | Types mirroring backend responses. |

## Adding a module when its API ships

1. Add the response types to `src/types/api.ts` and a call to `api` in `src/lib/api.ts`.
2. Create `src/app/<slug>/page.tsx` (a static folder overrides the `[module]` placeholder).
3. Set `available: true` for it in `src/lib/modules.ts`, and bump `BACKEND_PHASE_DONE`.

No sample or mock data is shown anywhere. Pages stay empty until real data exists.
