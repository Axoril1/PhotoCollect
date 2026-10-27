/**
 * QR Snap - Growth Engine Service (Wallet, Referrals, Coupons, Affiliates & Campaigns)
 */

import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Referral from "../models/Referral.js";
import Coupon from "../models/Coupon.js";
import Affiliate from "../models/Affiliate.js";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";
import usageService from "./usageService.js";

/**
 * Get or initialize user Credit Wallet
 */
export async function getWallet(userId) {
  let wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) {
    wallet = await Wallet.create({ owner: userId, balanceCents: 0 });
  }

  const transactions = await WalletTransaction.find({ walletId: wallet._id }).sort({ createdAt: -1 }).limit(20).lean();
  return { wallet, transactions };
}

/**
 * Credit user wallet
 */
export async function creditWallet(userId, amountCents, source, description) {
  const { wallet } = await getWallet(userId);
  wallet.balanceCents += amountCents;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    amountCents,
    type: "CREDIT",
    source,
    description,
  });

  return wallet;
}

/**
 * Debit user wallet
 */
export async function debitWallet(userId, amountCents, description) {
  const { wallet } = await getWallet(userId);
  if (wallet.balanceCents < amountCents) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balanceCents -= amountCents;
  await wallet.save();

  await WalletTransaction.create({
    walletId: wallet._id,
    amountCents,
    type: "DEBIT",
    source: "CHECKOUT_DEBIT",
    description,
  });

  return wallet;
}

/**
 * Get referral stats for user
 */
export async function getReferralStats(userId) {
  const user = await User.findById(userId).lean();
  const referralCode = `REF-${userId.toString().substring(18).toUpperCase()}`;

  const referrals = await Referral.find({ referrer: userId }).populate("referredUser", "name email createdAt").sort({ createdAt: -1 }).lean();

  const totalRewards = referrals.reduce((acc, r) => acc + (r.rewardIssued ? r.rewardAmountCents : 0), 0);

  return {
    referralCode,
    referralLink: `https://qrsnap.com/ref/${referralCode}`,
    totalReferrals: referrals.length,
    totalRewardsCents: totalRewards,
    referrals,
  };
}

/**
 * Redeem Coupon / Promo Code
 */
export async function redeemCoupon(userId, code) {
  const cleanCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

  if (!coupon) throw new Error("Invalid or expired coupon code");
  if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new Error("Coupon has expired");
  if (coupon.currentRedemptions >= coupon.maxRedemptions) throw new Error("Coupon redemption limit reached");

  coupon.currentRedemptions += 1;
  await coupon.save();

  if (coupon.discountType === "FIXED_AMOUNT") {
    await creditWallet(userId, coupon.discountValue, "PROMOTION", `Redeemed coupon ${cleanCode}`);
  } else if (coupon.discountType === "STORAGE_BONUS") {
    // Add 1GB bonus quota
    const usage = await usageService.getOrCreateUsage(userId);
    usage.tempQuotaBonusGB += 1;
    await usage.save();
  }

  return { message: "Coupon applied successfully", coupon };
}

/**
 * Get Affiliate stats for promoter
 */
export async function getAffiliateStats(userId) {
  let affiliate = await Affiliate.findOne({ userId });
  if (!affiliate) {
    const code = `AFF-${userId.toString().substring(18).toUpperCase()}`;
    affiliate = await Affiliate.create({
      userId,
      affiliateCode: code,
      commissionPercent: 20,
    });
  }

  return { affiliate };
}

/**
 * Get Active Campaigns
 */
export async function getCampaigns() {
  const campaigns = await Campaign.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  return { campaigns };
}

export default {
  getWallet,
  creditWallet,
  debitWallet,
  getReferralStats,
  redeemCoupon,
  getAffiliateStats,
  getCampaigns,
};
