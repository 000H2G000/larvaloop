import mongoose from 'mongoose';

export const IMAGE_SOURCES = ['camera', 'manual_upload', 'sample_dataset'];
export const ANALYSIS_STATUSES = ['none', 'pending', 'processing', 'completed', 'failed'];

const imageSchema = new mongoose.Schema(
  {
    // Trays arrive in Phase 2; until then images reference the tray by code.
    trayCode: { type: String, required: true, trim: true, uppercase: true, default: 'DEMO_TRAY' },
    filename: { type: String, required: true },
    originalName: { type: String },
    imagePath: { type: String, required: true }, // relative to UPLOAD_DIR, never exposed
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    capturedAt: { type: Date, required: true, default: Date.now },
    // sample_dataset = a printed/public dataset image, never data from a live tray.
    source: { type: String, enum: IMAGE_SOURCES, required: true, default: 'manual_upload' },
    analysisStatus: { type: String, enum: ANALYSIS_STATUSES, default: 'none' },
    latestAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageAnalysis', default: null },
  },
  { timestamps: true },
);

imageSchema.index({ trayCode: 1, capturedAt: -1 });

imageSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.imagePath;
    return ret;
  },
});

export const Image = mongoose.model('Image', imageSchema);
