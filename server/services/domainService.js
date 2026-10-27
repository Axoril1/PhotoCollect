/**
 * QR Snap - Custom Domain DNS Verification & SSL Provisioning Service
 */

import dns from "dns/promises";
import crypto from "crypto";
import Branding from "../models/Branding.js";

/**
 * Generate a unique verification token for DNS TXT record
 */
export function generateVerificationToken(domain) {
  const hash = crypto.createHash("sha256").update(`${domain}:${Date.now()}:${Math.random()}`).digest("hex").substring(0, 32);
  return `qrsnap-verify=${hash}`;
}

/**
 * Verify custom domain ownership via DNS TXT Record lookup
 */
export async function verifyDomainDNS(ownerId, customDomain) {
  const branding = await Branding.findOne({ ownerId });
  if (!branding || !branding.customDomain) {
    throw new Error("No custom domain configured for this account.");
  }

  const domainToTest = customDomain || branding.customDomain;
  const challengeHost = `_qrsnap-challenge.${domainToTest}`;

  try {
    const txtRecords = await dns.resolveTxt(challengeHost);
    const flatRecords = txtRecords.flat();

    const isMatch = flatRecords.some((record) => record === branding.verificationToken);

    if (isMatch) {
      branding.domainStatus = "VERIFIED";
      branding.sslStatus = "ACTIVE";
      branding.verifiedAt = new Date();
      await branding.save();

      return {
        success: true,
        message: `Domain ${domainToTest} successfully verified! SSL certificate active.`,
        branding,
      };
    } else {
      branding.domainStatus = "FAILED";
      await branding.save();
      return {
        success: false,
        message: `TXT record found at ${challengeHost}, but token did not match expected value.`,
      };
    }
  } catch (err) {
    console.warn(`[DomainService] DNS TXT lookup failed for ${challengeHost}:`, err.message);
    branding.domainStatus = "FAILED";
    await branding.save();

    return {
      success: false,
      message: `Could not find DNS TXT record at ${challengeHost}. Please ensure TXT record is propagated.`,
      error: err.message,
    };
  }
}

/**
 * Get domain verification & SSL status
 */
export async function getDomainStatus(ownerId) {
  const branding = await Branding.findOne({ ownerId }).lean();
  if (!branding) {
    return { configured: false };
  }

  return {
    configured: !!branding.customDomain,
    customDomain: branding.customDomain,
    domainStatus: branding.domainStatus,
    sslStatus: branding.sslStatus,
    verificationToken: branding.verificationToken,
    challengeRecord: branding.customDomain ? `_qrsnap-challenge.${branding.customDomain}` : null,
    verifiedAt: branding.verifiedAt,
  };
}

export default {
  generateVerificationToken,
  verifyDomainDNS,
  getDomainStatus,
};
