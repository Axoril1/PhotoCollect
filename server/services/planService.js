/**
 * QR Snap - Plan & Tier Management Service
 */

import Plan from "../models/Plan.js";

export const DEFAULT_PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "Ideal for individual guests and personal events",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "USD",
    features: [
      "gallery.qr",
      "moderation.ai",
      "analytics.basic",
    ],
    limits: {
      maxEvents: 1,
      maxStorageGB: 2,
      maxImages: 500,
      maxUploadsPerHour: 100,
      maxTeamMembers: 1,
    },
    isActive: true,
    displayOrder: 1,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Designed for event organizers, photographers, and agencies",
    monthlyPrice: 19,
    yearlyPrice: 190,
    currency: "USD",
    features: [
      "gallery.qr",
      "gallery.download",
      "gallery.zip",
      "moderation.ai",
      "analytics.basic",
      "analytics.advanced",
      "branding.custom",
      "events.unlimited",
      "storage.extended",
    ],
    limits: {
      maxEvents: -1, // Unlimited
      maxStorageGB: 50,
      maxImages: -1, // Unlimited
      maxUploadsPerHour: 1000,
      maxTeamMembers: 3,
    },
    isActive: true,
    displayOrder: 2,
  },
  {
    name: "Business",
    slug: "business",
    description: "Enterprise features, team collaboration, and priority processing",
    monthlyPrice: 59,
    yearlyPrice: 590,
    currency: "USD",
    features: [
      "gallery.qr",
      "gallery.download",
      "gallery.zip",
      "moderation.ai",
      "moderation.priority",
      "analytics.basic",
      "analytics.advanced",
      "branding.custom",
      "branding.whitelabel",
      "events.unlimited",
      "storage.extended",
      "team.members",
      "reports.export",
      "organization.manage",
    ],
    limits: {
      maxEvents: -1,
      maxStorageGB: 500,
      maxImages: -1,
      maxUploadsPerHour: 5000,
      maxTeamMembers: 10,
    },
    isActive: true,
    displayOrder: 3,
  },
];

/**
 * Seed default plans if database is empty
 */
export async function ensureDefaultPlans() {
  try {
    const count = await Plan.countDocuments();
    if (count === 0) {
      await Plan.insertMany(DEFAULT_PLANS);
      console.log("[PlanService] Successfully seeded default subscription plans (Free, Pro, Business)");
    } else {
      // Update prices to match current defaults
      for (const p of DEFAULT_PLANS) {
        await Plan.updateOne(
          { slug: p.slug },
          { $set: { monthlyPrice: p.monthlyPrice, yearlyPrice: p.yearlyPrice } }
        );
      }
    }
  } catch (err) {
    console.error("[PlanService] Error seeding default plans:", err);
  }
}

export async function getPlanBySlug(slug) {
  return Plan.findOne({ slug: slug.toLowerCase() }).lean();
}

export default {
  ensureDefaultPlans,
  getPlanBySlug,
};
