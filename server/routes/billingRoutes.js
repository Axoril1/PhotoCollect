/**
 * QR Snap - Stripe Billing & Checkout REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import paymentService from "../payment/paymentService.js";
import Subscription from "../models/Subscription.js";
import BillingEvent from "../models/BillingEvent.js";

const router = express.Router();

/**
 * POST /api/billing/webhook
 * Webhook listener for Stripe events (raw body required for signature verification)
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];

  try {
    let event;
    if (signature && process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes("YOUR_")) {
      event = paymentService.constructWebhookEvent(req.body, signature);
    } else {
      // Direct JSON payload fallback in dev mode
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    const result = await paymentService.handleStripeWebhookEvent(event);
    res.json({ received: true, ...result });
  } catch (err) {
    console.error("[BillingWebhook] Error processing webhook:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Protected routes below
router.use(requireAuth);

/**
 * POST /api/billing/create-checkout-session
 * Create a Stripe Checkout Session for plan upgrade
 */
router.post("/create-checkout-session", async (req, res, next) => {
  try {
    const { planSlug, interval = "monthly", successUrl, cancelUrl } = req.body;
    if (!planSlug) return res.status(400).json({ error: "Missing planSlug" });

    const session = await paymentService.createCheckoutSession({
      user: req.user,
      planSlug,
      interval,
      successUrl,
      cancelUrl,
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/billing/create-portal-session
 * Create a Stripe Customer Portal Session for managing payment methods & invoices
 */
router.post("/create-portal-session", async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const session = await paymentService.createPortalSession({
      user: req.user,
      returnUrl,
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/billing/resync-subscription
 * Manually resync user's subscription status with Stripe
 */
router.post("/resync-subscription", async (req, res, next) => {
  try {
    const subscription = await paymentService.resyncSubscription(req.user._id);
    res.json({ message: "Subscription resynced with Stripe", subscription });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/billing/subscription
 * Get current user's Stripe subscription status
 */
router.get("/subscription", async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ owner: req.user._id }).populate("plan").lean();
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/billing/history
 * Fetch billing events history for current user
 */
router.get("/history", async (req, res, next) => {
  try {
    const history = await BillingEvent.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
