import mongoose from 'mongoose';

export const ALERT_TYPES = ['temperature', 'humidity', 'flame', 'sensor_error', 'device_offline'];
export const ALERT_SEVERITIES = ['info', 'warning', 'critical'];
export const ALERT_STATUSES = ['active', 'acknowledged', 'resolved'];

const alertSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    deviceId: { type: String, required: true },
    trayCode: { type: String, required: true, uppercase: true },
    alertType: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'active' },
    // true while active or acknowledged; the partial unique index allows one open alert per device + type.
    open: { type: Boolean, default: true },
    triggerValue: { type: Number, default: null },
    peakValue: { type: Number, default: null },
    lastValue: { type: Number, default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, enum: ['system', 'user', null], default: null },
  },
  { timestamps: true },
);

alertSchema.index({ deviceId: 1, alertType: 1 }, { unique: true, partialFilterExpression: { open: true } });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ trayCode: 1, createdAt: -1 });

alertSchema.set('toJSON', { versionKey: false });

export const Alert = mongoose.model('Alert', alertSchema);
