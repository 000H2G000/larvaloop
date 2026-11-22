import mongoose from 'mongoose';

export const SYSTEM_STATUSES = ['NORMAL', 'WARNING', 'CRITICAL', 'FIRE_ALERT', 'SENSOR_ERROR'];

/** One ESP32 measurement. Append-only: readings are never updated or overwritten. */
const sensorReadingSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    deviceId: { type: String, required: true },
    trayCode: { type: String, required: true, uppercase: true },
    // null = the sensor failed to read; never replaced with an estimate.
    temperature: { type: Number, default: null },
    humidity: { type: Number, default: null },
    flameDetected: { type: Boolean, required: true },
    servoAngle: { type: Number, required: true },
    systemStatus: { type: String, enum: SYSTEM_STATUSES, required: true },
    sequence: { type: Number, default: null },
    recordedAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

sensorReadingSchema.index({ trayCode: 1, recordedAt: -1 });
sensorReadingSchema.index({ device: 1, recordedAt: -1 });
sensorReadingSchema.index({ recordedAt: -1 });

export const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);
