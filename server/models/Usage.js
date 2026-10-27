import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    currentStorageBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    imageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    eventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    guestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiRequests: {
      type: Number,
      default: 0,
      min: 0,
    },
    bandwidthBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    tempQuotaBonusGB: {
      type: Number,
      default: 0,
      min: 0,
    },
    warningLevel: {
      type: String,
      enum: ["NORMAL", "WARNING_50", "WARNING_75", "WARNING_90", "EXCEEDED_100"],
      default: "NORMAL",
      index: true,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

usageSchema.index({ owner: 1 });
usageSchema.index({ warningLevel: 1 });

export default mongoose.model("Usage", usageSchema);
