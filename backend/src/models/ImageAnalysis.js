import mongoose from 'mongoose';

export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed'];

const detectionSchema = new mongoose.Schema(
  {
    id: Number,
    confidence: Number,
    box: [Number], // x, y, w, h in analysed-image pixels
    lengthPx: Number,
    widthPx: Number,
    areaPx: Number,
    lengthMm: Number,
    widthMm: Number,
  },
  { _id: false },
);

/**
 * Result of one computer vision run. Fields stay null when the model gave no value:
 * results are never filled in or estimated by the backend.
 */
const imageAnalysisSchema = new mongoose.Schema(
  {
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: true, index: true },
    trayCode: { type: String, required: true, uppercase: true },
    jobId: { type: String, default: null },
    status: { type: String, enum: JOB_STATUSES, default: 'pending' },
    larvaeCount: { type: Number, default: null },
    calibrated: { type: Boolean, default: null },
    mmPerPx: { type: Number, default: null },
    lengthMm: {
      mean: { type: Number, default: null },
      median: { type: Number, default: null },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    detections: { type: [detectionSchema], default: [] },
    confidence: { type: Number, default: null }, // mean detection confidence
    modelVersion: { type: String, default: null },
    processingTimeMs: { type: Number, default: null },
    annotatedImagePath: { type: String, default: null }, // relative to UPLOAD_DIR, never exposed
    notes: { type: [String], default: [] },
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

imageAnalysisSchema.index({ trayCode: 1, createdAt: -1 });

imageAnalysisSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.hasAnnotatedImage = Boolean(ret.annotatedImagePath);
    delete ret.annotatedImagePath;
    return ret;
  },
});

export const ImageAnalysis = mongoose.model('ImageAnalysis', imageAnalysisSchema);
