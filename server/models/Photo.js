import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: "photo.jpg",
    },
    originalUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    uploaderName: {
      type: String,
      default: "Guest",
    },
    storageProvider: {
      type: String,
      enum: ["local", "r2"],
      default: "local",
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "auto_approved", "auto_rejected"],
      default: "approved",
      index: true,
    },
    moderationProvider: {
      type: String,
      enum: ["google_vision", "nsfwjs", "hybrid", "manual"],
      default: "hybrid",
      index: true,
    },
    aiConfidence: {
      type: Number,
      default: 0,
    },
    aiResults: {
      type: mongoose.Schema.Types.Mixed,
    },
    exifData: {
      type: mongoose.Schema.Types.Mixed,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewReason: {
      type: String,
      default: "",
    },
    manualOverride: {
      type: Boolean,
      default: false,
    },
    falsePositive: {
      type: Boolean,
      default: false,
    },
    falseNegative: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

photoSchema.index({ eventId: 1, moderationStatus: 1 });
photoSchema.index({ moderationStatus: 1, createdAt: -1 });

export default mongoose.model("Photo", photoSchema);