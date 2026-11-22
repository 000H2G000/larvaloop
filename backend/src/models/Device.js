import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    deviceType: { type: String, default: 'esp32' },
    // Trays arrive with Phase 2 models; until then devices reference the tray by code.
    trayCode: { type: String, required: true, uppercase: true, trim: true },
    firmwareVersion: { type: String, default: null },
    // HMAC-SHA256 of the API key (keyed with DEVICE_API_KEY_SECRET). The key itself is never stored.
    apiKeyHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    connectionStatus: { type: String, enum: ['online', 'offline'], default: 'offline' },
    lastSeen: { type: Date, default: null },
    lastSequence: { type: Number, default: null },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deviceSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.apiKeyHash;
    return ret;
  },
});

export const Device = mongoose.model('Device', deviceSchema);
