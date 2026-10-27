import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
      index: true,
    },
    rewardIssued: {
      type: Boolean,
      default: false,
    },
    rewardAmountCents: {
      type: Number,
      default: 1000, // $10 wallet reward
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ referrer: 1, referredUser: 1 }, { unique: true });

export default mongoose.model("Referral", referralSchema);
