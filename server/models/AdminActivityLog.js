import mongoose from "mongoose";

const adminActivityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true, // e.g. "admin_created", "role_updated", "user_suspended", "permission_granted"
      index: true,
    },
    resource: {
      type: String, // e.g. "User:123", "Setting:system"
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
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

adminActivityLogSchema.index({ adminId: 1, timestamp: -1 });

export default mongoose.model("AdminActivityLog", adminActivityLogSchema);
