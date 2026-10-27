import mongoose from "mongoose";

const stripeWebhookFailureSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
    },
    exception: {
      type: String,
    },
    stackTrace: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
    nextRetry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

stripeWebhookFailureSchema.index({ resolved: 1, createdAt: -1 });

export default mongoose.model("StripeWebhookFailure", stripeWebhookFailureSchema);
