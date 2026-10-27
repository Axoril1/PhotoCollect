/**
 * QR Snap - White-label Branding Engine Service
 */

import Branding from "../models/Branding.js";
import { generateVerificationToken } from "./domainService.js";

/**
 * Get or initialize Branding document for owner
 */
export async function getBranding(ownerId) {
  let branding = await Branding.findOne({ ownerId });
  if (!branding) {
    branding = await Branding.create({
      ownerId,
      companyName: "QR Snap",
      primaryColor: "#f59e0b",
      secondaryColor: "#0f172a",
      accentColor: "#10b981",
      fontFamily: "Inter",
    });
  }
  return branding;
}

/**
 * Update white-label branding configuration
 */
export async function updateBranding(ownerId, updateData) {
  let branding = await getBranding(ownerId);

  // If custom domain is being added/updated, generate new verification token
  if (updateData.customDomain && updateData.customDomain !== branding.customDomain) {
    updateData.verificationToken = generateVerificationToken(updateData.customDomain);
    updateData.domainStatus = "PENDING_VERIFICATION";
    updateData.sslStatus = "PENDING";
  }

  Object.assign(branding, updateData);
  await branding.save();

  return branding;
}

/**
 * Public Branding Resolver for Galleries & Custom Domains
 */
export async function getPublicBranding(domainOrOwnerId) {
  let branding = null;

  if (domainOrOwnerId.includes(".")) {
    branding = await Branding.findOne({ customDomain: domainOrOwnerId, domainStatus: "VERIFIED" }).lean();
  } else {
    branding = await Branding.findOne({ ownerId: domainOrOwnerId }).lean();
  }

  if (!branding) {
    return {
      companyName: "QR Snap",
      primaryColor: "#f59e0b",
      secondaryColor: "#0f172a",
      accentColor: "#10b981",
      fontFamily: "Inter",
    };
  }

  return branding;
}

export default {
  getBranding,
  updateBranding,
  getPublicBranding,
};
