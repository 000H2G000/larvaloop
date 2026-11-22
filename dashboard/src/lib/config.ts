const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export const config = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ""),
  /** Health is a status probe, not telemetry; live sensor data will come over Socket.IO (backend Phase 4). */
  healthPollMs: 15_000,
} as const;
