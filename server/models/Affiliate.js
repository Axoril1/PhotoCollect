import mongoose from "mongoose";

const affiliateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    affiliateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    commissionPercent: {
      type: Number,
      default: 20, // 20% commission
    },
    totalEarnedCents: {
      type: Number,
      default: 0,
    },
    pendingPayoutCents: {
      type: Number,
      default: 0,
    },
    paidOutCents: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Affiliate", affiliateSchema);
