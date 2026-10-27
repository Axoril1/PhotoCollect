/**
 * QR Snap - Subscription Lifecycle Management Service
 */

import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import BillingEvent from "../models/BillingEvent.js";

/**
 * Get or initialize active subscription for a user
 */
export async function getOrCreateUserSubscription(userId) {
  let sub = await Subscription.findOne({ owner: userId }).populate("plan");

  if (!sub) {
    const freePlan = await Plan.findOne({ slug: "free" });
    if (!freePlan) throw new Error("Free plan not initialized");

    sub = await Subscription.create({
      owner: userId,
      plan: freePlan._id,
      planSlug: "free",
      status: "ACTIVE",
    });

    sub = await sub.populate("plan");
  }

  return sub;
}

/**
 * Upgrade or downgrade a user's subscription plan
 */
export async function changePlan(userId, newPlanSlug, options = {}) {
  const newPlan = await Plan.findOne({ slug: newPlanSlug.toLowerCase() });
  if (!newPlan) throw new Error(`Plan '${newPlanSlug}' not found`);

  const currentSub = await getOrCreateUserSubscription(userId);
  const oldPlanSlug = currentSub.planSlug;

  currentSub.plan = newPlan._id;
  currentSub.planSlug = newPlan.slug;
  currentSub.status = "ACTIVE";
  currentSub.cancelAtPeriodEnd = false;
  if (options.expiresAt) currentSub.expiresAt = options.expiresAt;
  await currentSub.save();

  // Audit billing event
  await BillingEvent.create({
    subscriptionId: currentSub._id,
    userId,
    event: newPlan.slug === "free" ? "DOWNGRADED" : "UPGRADED",
    oldPlanSlug,
    newPlanSlug: newPlan.slug,
    notes: options.reason || `Plan changed from ${oldPlanSlug} to ${newPlan.slug}`,
  });

  return currentSub;
}

/**
 * Cancel subscription at end of billing period
 */
export async function cancelSubscription(userId) {
  const sub = await getOrCreateUserSubscription(userId);
  sub.cancelAtPeriodEnd = true;
  await sub.save();

  await BillingEvent.create({
    subscriptionId: sub._id,
    userId,
    event: "CANCELED",
    oldPlanSlug: sub.planSlug,
    newPlanSlug: sub.planSlug,
    notes: "Subscription scheduled for cancellation at period end",
  });

  return sub;
}

export default {
  getOrCreateUserSubscription,
  changePlan,
  cancelSubscription,
};
