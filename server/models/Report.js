import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ["photo", "event", "user", "organizer"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reporterName: {
      type: String,
      default: "Anonymous Guest",
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "adult_content",
        "violence",
        "harassment",
        "spam",
        "copyright",
        "privacy_violation",
        "illegal_content",
        "impersonation",
        "other",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "investigating", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
      index: true,
    },
    assignedModeratorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedModeratorName: {
      type: String,
      default: "Unassigned",
    },
    resolutionReason: {
      type: String,
      default: "",
    },
    riskScore: {
      type: Number,
      default: 50,
    },
    timeline: [
      {
        action: { type: String, required: true },
        adminName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
