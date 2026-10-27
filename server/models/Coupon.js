import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED_AMOUNT", "FREE_MONTH", "STORAGE_BONUS"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, // percentage or cents or bonus GB
    },
    expiresAt: {
      type: Date,
    },
    maxRedemptions: {
      type: Number,
      default: 100,
    },
    currentRedemptions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    stripeCouponId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Coupon", couponSchema);
