/**
 * QR Snap - Centralized Feature Gating Service
 */

import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

/**
 * Check if a user/subscriber has access to a specific feature key
 * @param {Object|String} userOrId - User object or User ID
 * @param {String} featureKey - Feature identifier (e.g. 'gallery.zip', 'branding.custom')
 * @returns {Promise<Boolean>}
 */
export async function hasFeature(userOrId, featureKey) {
  const userId = typeof userOrId === "object" ? userOrId._id || userOrId.id : userOrId;

  if (!userId) return false;

  // Fetch active subscription for user
  const sub = await Subscription.findOne({
    owner: userId,
    status: { $in: ["ACTIVE", "TRIAL"] },
  }).populate("plan").lean();

  if (!sub || !sub.plan) {
    // Default to Free Plan
    const freePlan = await Plan.findOne({ slug: "free" }).lean();
    return freePlan ? freePlan.features.includes(featureKey) : false;
  }

  return sub.plan.features.includes(featureKey);
}

export default {
  hasFeature,
};
