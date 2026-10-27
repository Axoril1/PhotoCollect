/**
 * QR Snap - Admin Subscription Management & Webhook Operations REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import StripeWebhookEvent from "../models/StripeWebhookEvent.js";
import StripeWebhookFailure from "../models/StripeWebhookFailure.js";
import paymentService from "../payment/paymentService.js";
import logSecurityEvent from "../services/auditLogService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/admin/subscriptions-center/webhooks
 * Paginated list of persistent Stripe Webhook Events
 */
router.get("/webhooks", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const { status, eventType, search } = req.query;

    const query = {};
    if (status && status !== "ALL") query.status = status;
    if (eventType && eventType !== "ALL") query.eventType = eventType;
    if (search) {
      query.$or = [
        { eventId: { $regex: search, $options: "i" } },
        { stripeCustomerId: { $regex: search, $options: "i" } },
        { stripeSubscriptionId: { $regex: search, $options: "i" } },
      ];
    }

    const [events, total] = await Promise.all([
      StripeWebhookEvent.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StripeWebhookEvent.countDocuments(query),
    ]);

    res.json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/subscriptions-center/webhooks/metrics
 * Monitoring metrics for Webhook Dashboard
 */
router.get("/webhooks/metrics", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const metrics = await paymentService.getWebhookMetrics();
    res.json({ metrics });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/subscriptions-center/webhooks/:eventId/replay
 * Safe admin replay execution for a failed or past webhook event
 */
router.post("/webhooks/:eventId/replay", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await paymentService.replayWebhookEvent(eventId, req.user._id);

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_webhook_replayed",
      status: "success",
      req,
      details: { eventId, result },
    });

    res.json({ message: `Webhook event '${eventId}' replayed successfully`, result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/subscriptions
 * Paginated list of subscriptions across all platform users
 */
router.get("/subscriptions", requirePermission(Permissions.USERS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const { status, planSlug } = req.query;

    const query = {};
    if (status && status !== "ALL") query.status = status;
    if (planSlug && planSlug !== "ALL") query.planSlug = planSlug;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate("owner", "name email role organizationName")
        .populate("plan")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    res.json({
      subscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/subscriptions/:id
 * Admin change subscription plan, grant trial, or suspend
 */
router.patch("/subscriptions/:id", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const { planSlug, status, trialDays } = req.body;

    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    if (planSlug) {
      const planDoc = await Plan.findOne({ slug: planSlug.toLowerCase() });
      if (!planDoc) return res.status(400).json({ error: "Invalid plan slug" });

      sub.plan = planDoc._id;
      sub.planSlug = planDoc.slug;
    }

    if (status) sub.status = status;

    if (trialDays) {
      sub.status = "TRIAL";
      sub.trialStart = new Date();
      sub.trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    }

    await sub.save();

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_subscription_modified",
      status: "success",
      req,
      details: { subscriptionId: sub._id, planSlug, status },
    });

    res.json({ message: "Subscription updated successfully", subscription: sub });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/plans
 * List all plans for admin management
 */
router.get("/plans", requirePermission(Permissions.SETTINGS_READ), async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ displayOrder: 1 }).lean();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/plans/:id
 * Update plan limits and feature access
 */
router.patch("/plans/:id", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const { name, monthlyPrice, yearlyPrice, features, limits, isActive } = req.body;

    if (name) plan.name = name;
    if (monthlyPrice !== undefined) plan.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) plan.yearlyPrice = yearlyPrice;
    if (features) plan.features = features;
    if (limits) plan.limits = { ...plan.limits, ...limits };
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    await logSecurityEvent({
      userId: req.user._id,
      event: "plan_definition_updated",
      status: "success",
      req,
      details: { planId: plan._id, slug: plan.slug },
    });

    res.json({ message: "Plan definition updated successfully", plan });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/subscriptions-center/usage/recalculate/:userId
 * Admin recalculate usage statistics for a specific user
 */
router.post("/usage/recalculate/:userId", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const usageService = (await import("../services/usageService.js")).default;
    const usage = await usageService.recalculateUserUsage(userId);
    res.json({ message: `Usage metrics recalculated for user ${userId}`, usage });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/subscriptions-center/usage/repair
 * Admin platform-wide background repair job for usage statistics
 */
router.post("/usage/repair", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const usageService = (await import("../services/usageService.js")).default;
    const result = await usageService.repairAllUsageRecords();

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_usage_repaired",
      status: "success",
      req,
      details: result,
    });

    res.json({ message: "Platform-wide usage metrics repair completed", result });
  } catch (err) {
    next(err);
  }
});

export default router;
