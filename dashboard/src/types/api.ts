/**
 * Mirrors the backend response envelope (see backend src/utils/ApiResponse.js
 * and src/middlewares/errorMiddleware.js).
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T, M = PaginationMeta> {
  success: true;
  message: string;
  data: T;
  meta?: M;
}

export interface ApiFailure {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** GET /health — backend src/services/healthService.js */
export type DatabaseState = "disconnected" | "connected" | "connecting" | "disconnecting" | "unknown";

export interface HealthStatus {
  status: "ok" | "degraded";
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  dependencies: {
    mongodb: DatabaseState;
    vision?: "up" | "down";
  };
}

/** /images — backend src/models/Image.js and ImageAnalysis.js */
export type ImageSource = "camera" | "manual_upload" | "sample_dataset";
export type AnalysisStatus = "none" | "pending" | "processing" | "completed" | "failed";

export interface LengthStats {
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface Detection {
  id: number;
  confidence: number;
  box: [number, number, number, number];
  lengthPx: number | null;
  widthPx: number | null;
  areaPx: number | null;
  lengthMm: number | null;
  widthMm: number | null;
}

export interface ImageAnalysis {
  _id: string;
  image: string;
  trayCode: string;
  jobId: string | null;
  status: Exclude<AnalysisStatus, "none">;
  larvaeCount: number | null;
  calibrated: boolean | null;
  mmPerPx: number | null;
  lengthMm: LengthStats;
  detections: Detection[];
  confidence: number | null;
  modelVersion: string | null;
  processingTimeMs: number | null;
  hasAnnotatedImage: boolean;
  notes: string[];
  error: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ImageRecord {
  _id: string;
  trayCode: string;
  filename: string;
  originalName?: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  source: ImageSource;
  analysisStatus: AnalysisStatus;
  latestAnalysis: Pick<ImageAnalysis, "_id" | "status" | "larvaeCount" | "lengthMm" | "calibrated" | "confidence" | "completedAt"> | null;
  createdAt: string;
}

/** /telemetry, /alerts, /devices — backend src/models/{Device,SensorReading,Alert}.js */
export type SystemStatus = "NORMAL" | "WARNING" | "CRITICAL" | "FIRE_ALERT" | "SENSOR_ERROR";

export interface Device {
  _id: string;
  deviceId: string;
  name?: string;
  trayCode: string;
  firmwareVersion: string | null;
  connectionStatus: "online" | "offline";
  lastSeen: string | null;
  isActive: boolean;
}

export interface SensorReading {
  _id: string;
  deviceId: string;
  trayCode: string;
  temperature: number | null;
  humidity: number | null;
  flameDetected: boolean;
  servoAngle: number;
  systemStatus: SystemStatus;
  recordedAt: string;
}

export interface Thresholds {
  temperature: { warning: number; critical: number; hysteresis: number };
  humidity: { min: number; max: number; hysteresis: number };
}

export interface LatestTelemetry {
  items: { device: Device; reading: SensorReading | null }[];
  thresholds: Thresholds;
  offlineAfterSeconds: number;
}

export interface TelemetryHistory {
  readings: SensorReading[];
  from: string;
  to: string;
}

export type AlertType = "temperature" | "humidity" | "flame" | "sensor_error" | "device_offline";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface Alert {
  _id: string;
  deviceId: string;
  trayCode: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  open: boolean;
  triggerValue: number | null;
  peakValue: number | null;
  lastValue: number | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: "system" | "user" | null;
  createdAt: string;
  updatedAt: string;
}
