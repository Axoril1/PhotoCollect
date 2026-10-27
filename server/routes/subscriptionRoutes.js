/**
 * QR Snap - Public & Organizer Subscription REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import Plan from "../models/Plan.js";
import { getOrCreateUserSubscription, changePlan, cancelSubscription } from "../services/subscriptionService.js";
import usageService from "../services/usageService.js";
import { ensureDefaultPlans } from "../services/planService.js";
import BillingEvent from "../models/BillingEvent.js";

const router = express.Router();

// Ensure plans exist in database
ensureDefaultPlans();

/**
 * GET /api/plans
 * Public endpoint returning available plans & features
 */
router.get("/plans", async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

// Protected endpoints below
router.use(requireAuth);

/**
 * GET /api/subscription
 * Get current authenticated user's active subscription
 */
router.get("/subscription", async (req, res, next) => {
  try {
    const subscription = await getOrCreateUserSubscription(req.user._id);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/subscription/usage
 * Get current user's real-time usage stats & quota limits
 */
router.get("/subscription/usage", async (req, res, next) => {
  try {
    const [subscription, usage] = await Promise.all([
      getOrCreateUserSubscription(req.user._id),
      usageService.getUserUsage(req.user._id),
    ]);

    const plan = subscription.plan;
    const limits = plan ? plan.limits : { maxEvents: 1, maxStorageGB: 2, maxImages: 500 };
    const totalAllowedGB = (limits.maxStorageGB || 1) + (usage.tempQuotaBonusGB || 0);
    const maxStorageBytes = totalAllowedGB * 1024 * 1024 * 1024;
    const currentStorage = usage.currentStorageBytes || usage.storageBytes || 0;

    res.json({
      subscription,
      usage,
      limits: { ...limits, maxStorageGB: totalAllowedGB },
      quotaProgress: {
        eventsPercent: limits.maxEvents === -1 ? 0 : Math.min(100, Number((((usage.eventCount || usage.eventsCreated || 0) / limits.maxEvents) * 100).toFixed(1))),
        storagePercent: Math.min(100, Number(((currentStorage / maxStorageBytes) * 100).toFixed(1))),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/subscription/usage/history
 * Fetch usage audit log history
 */
router.get("/subscription/usage/history", async (req, res, next) => {
  try {
    const history = await BillingEvent.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/usage/recalculate
 * User self-service usage recalculation
 */
router.post("/subscription/usage/recalculate", async (req, res, next) => {
  try {
    const usage = await usageService.recalculateUserUsage(req.user._id);
    res.json({ message: "Usage statistics recalculated successfully", usage });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade user subscription plan
 */
router.post("/subscription/upgrade", async (req, res, next) => {
  try {
    const { planSlug } = req.body;
    if (!planSlug) return res.status(400).json({ error: "Missing planSlug" });

    const subscription = await changePlan(req.user._id, planSlug, { reason: "User self-upgrade" });
    res.json({ message: `Successfully upgraded to ${planSlug.toUpperCase()} plan`, subscription });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/downgrade
 * Downgrade user subscription plan
 */
router.post("/subscription/downgrade", async (req, res, next) => {
  try {
    const { planSlug } = req.body;
    if (!planSlug) return res.status(400).json({ error: "Missing planSlug" });

    const subscription = await changePlan(req.user._id, planSlug, { reason: "User self-downgrade" });
    res.json({ message: `Successfully downgraded to ${planSlug.toUpperCase()} plan`, subscription });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription at period end
 */
router.post("/subscription/cancel", async (req, res, next) => {
  try {
    const subscription = await cancelSubscription(req.user._id);
    res.json({ message: "Subscription scheduled for cancellation at period end", subscription });
  } catch (err) {
    next(err);
  }
});

export default router;
