import mongoose from "mongoose";

const subscriptionUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    storageBytes: { type: Number, default: 0 },
    imagesUploaded: { type: Number, default: 0 },
    eventsCreated: { type: Number, default: 0 },
    uploadsToday: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    lastUploadAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionUsage", subscriptionUsageSchema);
