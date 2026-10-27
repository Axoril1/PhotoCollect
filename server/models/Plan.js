import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: "" },
    monthlyPrice: { type: Number, required: true, default: 0 },
    yearlyPrice: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },
    features: [{ type: String }], // e.g. ['gallery.download', 'gallery.zip', 'analytics.advanced']
    limits: {
      maxEvents: { type: Number, default: 1 }, // -1 for unlimited
      maxStorageGB: { type: Number, default: 2 },
      maxImages: { type: Number, default: 500 },
      maxUploadsPerHour: { type: Number, default: 100 },
      maxTeamMembers: { type: Number, default: 1 },
    },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
