import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    password: {
      type: String,
      default: null,
    },
    organizerName: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "disabled", "archived"],
      default: "active",
      index: true,
    },
    uploadLimit: {
      type: Number,
      default: 250,
    },
    storageQuotaBytes: {
      type: Number,
      default: 5368709120, // 5 GB default
    },
    planSnapshot: {
      type: String,
      enum: ["free", "pro", "studio"],
      default: "free",
    },
    branding: {
      coverImage: { type: String, default: "" },
      logo: { type: String, default: "" },
      accentColor: { type: String, default: "#1e3a24" },
      theme: { type: String, default: "classic" },
      welcomeTitle: { type: String, default: "" },
      welcomeMessage: { type: String, default: "" },
      organizerName: { type: String, default: "" },
      organizerWebsite: { type: String, default: "" },
      organizerInstagram: { type: String, default: "" },
      organizerFacebook: { type: String, default: "" },
      organizerEmail: { type: String, default: "" },
      organizerPhone: { type: String, default: "" },
      footerText: { type: String, default: "" },
      customButtonText: { type: String, default: "" },
      galleryLayout: { type: String, default: "grid" },
      fontFamily: { type: String, default: "sans" },
    },
  },
  { timestamps: true }
);

eventSchema.index({ ownerId: 1, status: 1 });
eventSchema.index({ createdAt: -1 });

export default mongoose.model("Event", eventSchema);
