import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "general",
        "uploads",
        "moderation",
        "storage",
        "authentication",
        "email",
        "integrations",
        "security",
        "branding",
        "feature_flags",
        "maintenance",
      ],
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedByName: {
      type: String,
      default: "System Admin",
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

platformConfigSchema.index({ category: 1 });

export default mongoose.model("PlatformConfig", platformConfigSchema);
