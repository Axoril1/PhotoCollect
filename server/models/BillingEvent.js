import mongoose from "mongoose";

const billingEventSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: ["CREATED", "UPGRADED", "DOWNGRADED", "RENEWED", "CANCELED", "SUSPENDED", "TRIAL_STARTED"],
      required: true,
    },
    oldPlanSlug: { type: String },
    newPlanSlug: { type: String },
    notes: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("BillingEvent", billingEventSchema);
