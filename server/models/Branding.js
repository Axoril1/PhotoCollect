import mongoose from "mongoose";

const brandingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      default: "QR Snap",
    },
    logoUrl: {
      type: String,
    },
    faviconUrl: {
      type: String,
    },
    primaryColor: {
      type: String,
      default: "#f59e0b",
    },
    secondaryColor: {
      type: String,
      default: "#0f172a",
    },
    accentColor: {
      type: String,
      default: "#10b981",
    },
    fontFamily: {
      type: String,
      default: "Inter",
    },
    emailHeaderImage: {
      type: String,
    },
    emailFooterText: {
      type: String,
    },
    loginBackgroundImage: {
      type: String,
    },
    galleryBannerImage: {
      type: String,
    },
    qrLogo: {
      type: String,
    },
    customDomain: {
      type: String,
      index: true,
    },
    domainStatus: {
      type: String,
      enum: ["UNVERIFIED", "PENDING_VERIFICATION", "VERIFIED", "FAILED"],
      default: "UNVERIFIED",
      index: true,
    },
    sslStatus: {
      type: String,
      enum: ["PENDING", "PROVISIONING", "ACTIVE", "FAILED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    verificationToken: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

brandingSchema.index({ customDomain: 1 }, { sparse: true });

export default mongoose.model("Branding", brandingSchema);
