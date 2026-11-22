import { config } from "@/lib/config";
import type {
  Alert,
  ApiEnvelope,
  ApiSuccess,
  HealthStatus,
  ImageAnalysis,
  ImageRecord,
  ImageSource,
  LatestTelemetry,
  TelemetryHistory,
} from "@/types/api";

/** Error carrying the backend's error code, so UI can branch on it (e.g. UNAUTHORIZED later). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NETWORK_ERROR = "NETWORK_ERROR";

/**
 * Thin fetch wrapper that unwraps `{ success, message, data, meta }`.
 * Non-2xx responses with a valid envelope are still returned when `allowStatus` includes them
 * (the health endpoint answers 503 with a full body when MongoDB is down).
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit & { allowStatus?: number[] } = {},
): Promise<ApiSuccess<T>> {
  const { allowStatus = [], headers, ...rest } = init;

  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...rest,
      headers: { Accept: "application/json", ...headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${config.apiUrl}`, 0, NETWORK_ERROR);
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response (proxy error page, etc.)
  }

  if (!body) {
    throw new ApiError(`Unexpected response (HTTP ${res.status})`, res.status, "INVALID_RESPONSE");
  }

  if ((res.ok || allowStatus.includes(res.status)) && "data" in body) {
    return body as ApiSuccess<T>;
  }

  if (body.success === false) {
    throw new ApiError(body.message, res.status, body.code, body.details);
  }
  throw new ApiError(body.message ?? `HTTP ${res.status}`, res.status, "HTTP_ERROR");
}

export const api = {
  getHealth: () => apiRequest<HealthStatus>("/health", { allowStatus: [503] }).then((r) => r.data),

  uploadImage: (file: Blob, { source, trayCode, filename }: { source: ImageSource; trayCode?: string; filename?: string }) => {
    const form = new FormData();
    form.append("image", file, filename ?? "capture.jpg");
    form.append("source", source);
    if (trayCode) form.append("trayCode", trayCode);
    return apiRequest<ImageRecord>("/images", { method: "POST", body: form }).then((r) => r.data);
  },
  getImage: (id: string) => apiRequest<ImageRecord>(`/images/${id}`).then((r) => r.data),
  listImages: (limit = 12) => apiRequest<ImageRecord[]>(`/images?limit=${limit}`),
  analyzeImage: (id: string) => apiRequest<ImageAnalysis>(`/images/${id}/analyze`, { method: "POST" }).then((r) => r.data),
  getAnalysis: (id: string) => apiRequest<ImageAnalysis>(`/images/${id}/analysis`).then((r) => r.data),

  getLatestTelemetry: () => apiRequest<LatestTelemetry>("/telemetry/latest").then((r) => r.data),
  getTelemetryHistory: (deviceId: string, from: Date) =>
    apiRequest<TelemetryHistory>(
      `/telemetry/history?deviceId=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from.toISOString())}&limit=5000`,
    ).then((r) => r.data),

  listAlerts: (params: { status?: "open" | "resolved" | "all"; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams({ status: params.status ?? "open", page: String(params.page ?? 1), limit: String(params.limit ?? 20) });
    return apiRequest<Alert[]>(`/alerts?${q}`);
  },
  acknowledgeAlert: (id: string) => apiRequest<Alert>(`/alerts/${id}/acknowledge`, { method: "PATCH" }).then((r) => r.data),
  resolveAlert: (id: string) => apiRequest<Alert>(`/alerts/${id}/resolve`, { method: "PATCH" }).then((r) => r.data),
};

export const imageUrls = {
  original: (id: string) => `${config.apiUrl}/images/${id}/file`,
  // The analysis id busts the browser cache when an image is re-analysed.
  annotated: (id: string, analysisId: string) => `${config.apiUrl}/images/${id}/analysis/annotated?v=${analysisId}`,
};

export const isNetworkError = (err: unknown) => err instanceof ApiError && err.code === NETWORK_ERROR;
