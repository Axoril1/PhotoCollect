import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planSlug: {
      type: String,
      required: true,
      default: "free",
      index: true,
    },
    status: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    trialStart: { type: Date },
    trialEnd: { type: Date },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    provider: { type: String, default: "internal" }, // "internal", "stripe", etc.
    providerCustomerId: { type: String, default: "" },
    providerSubscriptionId: { type: String, default: "" },
    providerPriceId: { type: String, default: "" },
    lastWebhookEvent: { type: String, default: "" },
    lastSyncedAt: { type: Date },
    syncStatus: { type: String, enum: ["synced", "pending", "failed"], default: "synced" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

subscriptionSchema.index({ owner: 1, status: 1 });
subscriptionSchema.index({ providerCustomerId: 1 });
subscriptionSchema.index({ providerSubscriptionId: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
