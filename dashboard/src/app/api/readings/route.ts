/**
 * Compatibility endpoint for ESP32 firmware that cannot be changed:
 * it posts to http://<PC>:3000/api/readings without auth headers.
 *
 * This route (server-side only) forwards the reading to the backend's
 * POST /api/v1/telemetry and adds the device's X-Device-Id / X-Api-Key from
 * LEGACY_DEVICE_KEYS. Keys never reach the browser (no NEXT_PUBLIC_ prefix).
 * All validation, alerts and offline detection still happen in the backend.
 *
 * Trade-off: anyone on the same network who knows a registered deviceId can post
 * as that device through this route. Use on a private network (e.g. phone hotspot);
 * new firmware should call the backend directly with its own key.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");

/** "ESP32_TRAY_01:a2p_xxx,OTHER:a2p_yyy" -> Map */
const DEVICE_KEYS = new Map(
  (process.env.LEGACY_DEVICE_KEYS ?? "")
    .split(",")
    .map((pair) => pair.trim().split(":"))
    .filter(([id, key]) => id && key)
    .map(([id, key]) => [id.trim(), key.trim()] as const),
);

const fail = (status: number, message: string, code: string) =>
  NextResponse.json({ success: false, message, code }, { status });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Body must be JSON", "BAD_REQUEST");
  }

  const deviceId = typeof body === "object" && body !== null ? (body as Record<string, unknown>).deviceId : undefined;
  if (typeof deviceId !== "string") return fail(400, "Missing deviceId", "BAD_REQUEST");

  const apiKey = DEVICE_KEYS.get(deviceId);
  if (!apiKey) return fail(401, `Device ${deviceId} is not enabled for /api/readings`, "DEVICE_AUTH_INVALID");

  try {
    const res = await fetch(`${BACKEND}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId, "X-Api-Key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({ success: false, message: "Invalid backend response" }));
    return NextResponse.json(json, { status: res.status });
  } catch {
    return fail(503, "Backend unreachable", "BACKEND_UNAVAILABLE");
  }
}

export function GET() {
  return NextResponse.json({
    success: true,
    message: "POST ESP32 readings here (JSON). Forwarded to the backend /api/v1/telemetry.",
    data: { enabledDevices: [...DEVICE_KEYS.keys()] },
  });
}
