import mongoose from "mongoose";

const stripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    apiVersion: {
      type: String,
    },
    createdByStripe: {
      type: Boolean,
      default: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PROCESSED", "FAILED", "DUPLICATE_IGNORED"],
      default: "PENDING",
      index: true,
    },
    processingDurationMs: {
      type: Number,
    },
    payloadHash: {
      type: String,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
    },
    requestId: {
      type: String,
    },
    livemode: {
      type: Boolean,
      default: false,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    stackTrace: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

stripeWebhookEventSchema.index({ eventType: 1, status: 1 });
stripeWebhookEventSchema.index({ createdAt: -1 });

export default mongoose.model("StripeWebhookEvent", stripeWebhookEventSchema);
