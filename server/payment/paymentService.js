/**
 * QR Snap - Unified Payment Service Abstraction & Production Webhook Engine
 */

import crypto from "crypto";
import {
  getStripeClient,
  getPriceIdForPlan,
  getPlanSlugFromPriceId,
  createStripeCustomer,
  createStripeCheckoutSession,
  createStripePortalSession,
  constructWebhookEvent,
} from "./providers/stripeProvider.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { changePlan } from "../services/subscriptionService.js";
import BillingEvent from "../models/BillingEvent.js";
import StripeWebhookEvent from "../models/StripeWebhookEvent.js";
import StripeWebhookFailure from "../models/StripeWebhookFailure.js";

/**
 * Ensure user has a valid Stripe customer ID (reuses existing customer)
 */
export async function getOrCreateCustomer(user) {
  let sub = await Subscription.findOne({ owner: user._id });

  if (sub && sub.providerCustomerId) {
    return sub.providerCustomerId;
  }

  // Create customer in Stripe
  const customer = await createStripeCustomer({
    email: user.email,
    name: user.name,
    userId: user._id,
  });

  if (sub) {
    sub.providerCustomerId = customer.id;
    sub.provider = "stripe";
    await sub.save();
  }

  return customer.id;
}

/**
 * Create checkout session for user upgrade/downgrade
 */
export async function createCheckoutSession({ user, planSlug, interval = "monthly", successUrl, cancelUrl }) {
  const priceId = getPriceIdForPlan(planSlug, interval);
  if (!priceId || priceId.includes("YOUR_")) {
    throw new Error(`Invalid or unconfigured Stripe Price ID for plan '${planSlug}' (${interval}). Please set environment variables.`);
  }

  const customerId = await getOrCreateCustomer(user);

  const session = await createStripeCheckoutSession({
    customerId,
    priceId,
    userId: user._id,
    successUrl: successUrl || `${process.env.CLIENT_URL || "http://localhost:5173"}/billing?success=true`,
    cancelUrl: cancelUrl || `${process.env.CLIENT_URL || "http://localhost:5173"}/billing?canceled=true`,
  });

  return { sessionId: session.id, checkoutUrl: session.url };
}

/**
 * Create billing portal session for managing payment methods & invoices
 */
export async function createPortalSession({ user, returnUrl }) {
  const customerId = await getOrCreateCustomer(user);

  const session = await createStripePortalSession({
    customerId,
    returnUrl: returnUrl || `${process.env.CLIENT_URL || "http://localhost:5173"}/billing`,
  });

  return { portalUrl: session.url };
}

/**
 * Resync local subscription status directly from Stripe API
 */
export async function resyncSubscription(userId) {
  const sub = await Subscription.findOne({ owner: userId }).populate("plan");
  if (!sub || !sub.providerCustomerId) {
    return sub;
  }

  try {
    const stripe = getStripeClient();
    const stripeSubs = await stripe.subscriptions.list({
      customer: sub.providerCustomerId,
      status: "all",
      limit: 1,
    });

    if (stripeSubs.data.length > 0) {
      const activeSub = stripeSubs.data[0];
      const statusMap = {
        active: "ACTIVE",
        trialing: "TRIAL",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "EXPIRED",
      };

      const newStatus = statusMap[activeSub.status] || "ACTIVE";
      const priceId = activeSub.items.data[0]?.price?.id;
      const planSlug = priceId ? getPlanSlugFromPriceId(priceId) : sub.planSlug;

      if (planSlug !== sub.planSlug) {
        await changePlan(userId, planSlug, { reason: "Stripe subscription resync" });
      }

      sub.status = newStatus;
      sub.providerSubscriptionId = activeSub.id;
      sub.providerPriceId = priceId || sub.providerPriceId;
      sub.expiresAt = new Date(activeSub.current_period_end * 1000);
      sub.lastSyncedAt = new Date();
      sub.syncStatus = "synced";
      await sub.save();
    }
  } catch (err) {
    console.error(`[SubscriptionResync] Failure syncing for user ${userId}:`, err.message);
    sub.syncStatus = "failed";
    await sub.save();
  }

  return sub;
}

/**
 * Persistent Database-Backed Webhook Event Handler
 */
export async function handleStripeWebhookEvent(event) {
  const startTime = Date.now();
  const eventId = event.id || `evt_fallback_${Date.now()}`;
  const eventType = event.type || "unknown";
  const dataObject = event.data?.object || {};
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(event)).digest("hex");

  // Step 4: Persistent Idempotency Check via Database
  const existingRecord = await StripeWebhookEvent.findOne({ eventId });
  if (existingRecord && existingRecord.status === "PROCESSED") {
    console.log(`[StripeWebhook] Duplicate event ignored (Database-backed): ${eventId}`);
    return { status: "duplicate_ignored", eventId };
  }

  // Step 6: Create or update processing record
  let webhookRecord = existingRecord;
  if (!webhookRecord) {
    try {
      webhookRecord = await StripeWebhookEvent.create({
        eventId,
        eventType,
        apiVersion: event.api_version,
        receivedAt: new Date(),
        status: "PROCESSING",
        payloadHash,
        stripeCustomerId: dataObject.customer,
        stripeSubscriptionId: dataObject.subscription || dataObject.id,
        stripeInvoiceId: dataObject.invoice,
        requestId: event.request?.id,
        livemode: event.livemode || false,
        metadata: dataObject.metadata || {},
      });
    } catch (dbErr) {
      // Race condition safety: Handles unique constraint duplicate insertion
      if (dbErr.code === 11000) {
        console.log(`[StripeWebhook] Concurrent duplicate execution caught by database index: ${eventId}`);
        return { status: "duplicate_ignored", eventId };
      }
      throw dbErr;
    }
  } else {
    webhookRecord.status = "PROCESSING";
    webhookRecord.retryCount += 1;
    webhookRecord.lastRetryAt = new Date();
    await webhookRecord.save();
  }

  // Step 7 - 9: Execute Business Logic
  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const userId = dataObject.client_reference_id || dataObject.metadata?.userId;
        const customerId = dataObject.customer;
        const subscriptionId = dataObject.subscription;
        const priceId = dataObject.metadata?.priceId;

        if (userId) {
          const planSlug = priceId ? getPlanSlugFromPriceId(priceId) : "pro";
          await changePlan(userId, planSlug, { reason: "Stripe checkout session completed" });

          await Subscription.updateOne(
            { owner: userId },
            {
              provider: "stripe",
              providerCustomerId: customerId,
              providerSubscriptionId: subscriptionId,
              providerPriceId: priceId,
              lastWebhookEvent: eventType,
              lastSyncedAt: new Date(),
              syncStatus: "synced",
            }
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const customerId = dataObject.customer;
        const subscriptionId = dataObject.id;
        const status = dataObject.status === "active" ? "ACTIVE" : dataObject.status === "trialing" ? "TRIAL" : "PAST_DUE";
        const currentPeriodEnd = new Date(dataObject.current_period_end * 1000);

        const sub = await Subscription.findOne({ providerCustomerId: customerId });
        if (sub) {
          sub.status = status;
          sub.expiresAt = currentPeriodEnd;
          sub.providerSubscriptionId = subscriptionId;
          sub.lastWebhookEvent = eventType;
          sub.lastSyncedAt = new Date();
          sub.syncStatus = "synced";
          await sub.save();
        }
        break;
      }

      case "customer.subscription.deleted": {
        const customerId = dataObject.customer;
        const sub = await Subscription.findOne({ providerCustomerId: customerId });
        if (sub) {
          await changePlan(sub.owner, "free", { reason: "Stripe subscription deleted/canceled" });
          sub.status = "CANCELED";
          sub.lastWebhookEvent = eventType;
          sub.lastSyncedAt = new Date();
          await sub.save();
        }
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${eventType}`);
    }

    // Step 10: Mark webhook processed successfully
    const duration = Date.now() - startTime;
    webhookRecord.status = "PROCESSED";
    webhookRecord.processedAt = new Date();
    webhookRecord.processingDurationMs = duration;
    await webhookRecord.save();

    return { status: "success", eventId, durationMs: duration };
  } catch (err) {
    // Failure handling & persistent error tracking
    const duration = Date.now() - startTime;
    webhookRecord.status = "FAILED";
    webhookRecord.errorMessage = err.message;
    webhookRecord.stackTrace = err.stack;
    webhookRecord.processingDurationMs = duration;
    await webhookRecord.save();

    await StripeWebhookFailure.create({
      eventId,
      eventType,
      failureReason: err.message,
      exception: err.name,
      stackTrace: err.stack,
      retryCount: webhookRecord.retryCount,
      lastAttempt: new Date(),
    });

    console.error(`[StripeWebhook] Failure processing event ${eventId}:`, err.message);
    throw err;
  }
}

/**
 * Admin Action: Replay a failed webhook event
 */
export async function replayWebhookEvent(eventId, adminUserId) {
  const webhookRecord = await StripeWebhookEvent.findOne({ eventId });
  if (!webhookRecord) {
    throw new Error(`Webhook event '${eventId}' not found`);
  }

  // Construct synthetic Stripe event structure for reprocessing
  const syntheticEvent = {
    id: webhookRecord.eventId,
    type: webhookRecord.eventType,
    api_version: webhookRecord.apiVersion,
    livemode: webhookRecord.livemode,
    data: {
      object: {
        customer: webhookRecord.stripeCustomerId,
        subscription: webhookRecord.stripeSubscriptionId,
        invoice: webhookRecord.stripeInvoiceId,
        metadata: webhookRecord.metadata || {},
      },
    },
  };

  // Reset status to allow execution
  webhookRecord.status = "PENDING";
  await webhookRecord.save();

  const result = await handleStripeWebhookEvent(syntheticEvent);

  // Mark failure record resolved if present
  await StripeWebhookFailure.updateMany(
    { eventId },
    {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminUserId ? String(adminUserId) : "SYSTEM_REPLAY",
      },
    }
  );

  return result;
}

/**
 * Aggregated Monitoring Statistics for Admin Webhook Dashboard
 */
export async function getWebhookMetrics() {
  const [totalProcessed, totalFailed, totalDuplicates, pendingCount, avgDurationRes] = await Promise.all([
    StripeWebhookEvent.countDocuments({ status: "PROCESSED" }),
    StripeWebhookEvent.countDocuments({ status: "FAILED" }),
    StripeWebhookEvent.countDocuments({ status: "DUPLICATE_IGNORED" }),
    StripeWebhookEvent.countDocuments({ status: "PENDING" }),
    StripeWebhookEvent.aggregate([
      { $match: { status: "PROCESSED" } },
      { $group: { _id: null, avgMs: { $avg: "$processingDurationMs" } } },
    ]),
  ]);

  const avgDurationMs = avgDurationRes[0]?.avgMs ? Math.round(avgDurationRes[0].avgMs) : 0;

  return {
    totalProcessed,
    totalFailed,
    totalDuplicates,
    pendingCount,
    avgDurationMs,
  };
}

export default {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  resyncSubscription,
  handleStripeWebhookEvent,
  constructWebhookEvent,
  replayWebhookEvent,
  getWebhookMetrics,
};
