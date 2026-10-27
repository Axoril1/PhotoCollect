import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      index: true,
    },
    type: {
      type: String,
      enum: ["QR_SCAN", "GALLERY_VIEW", "UPLOAD", "DOWNLOAD", "ZIP_DOWNLOAD", "AI_MODERATION"],
      required: true,
      index: true,
    },
    device: {
      type: String,
      default: "Desktop",
    },
    browser: {
      type: String,
      default: "Chrome",
    },
    os: {
      type: String,
      default: "Windows",
    },
    country: {
      type: String,
      default: "Unknown",
    },
    ipHash: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({ ownerId: 1, type: 1, timestamp: -1 });
analyticsEventSchema.index({ eventId: 1, type: 1 });

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
