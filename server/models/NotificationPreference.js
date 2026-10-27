import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    emailEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    marketing: { type: Boolean, default: true },
    billing: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    uploads: { type: Boolean, default: true },
    security: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("NotificationPreference", notificationPreferenceSchema);
