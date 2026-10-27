/**
 * QR Snap - Growth Engine REST API (Referrals, Coupons, Wallet, Campaigns)
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import growthService from "../services/growthService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/growth/referrals
 */
router.get("/referrals", async (req, res, next) => {
  try {
    const stats = await growthService.getReferralStats(req.user._id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/growth/redeem
 */
router.post("/redeem", async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Coupon code is required" });

    const result = await growthService.redeemCoupon(req.user._id, code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/growth/wallet
 */
router.get("/wallet", async (req, res, next) => {
  try {
    const data = await growthService.getWallet(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/growth/campaigns
 */
router.get("/campaigns", async (req, res, next) => {
  try {
    const data = await growthService.getCampaigns();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/growth/affiliate
 */
router.get("/affiliate", async (req, res, next) => {
  try {
    const data = await growthService.getAffiliateStats(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/growth/gift
 */
router.post("/gift", async (req, res, next) => {
  try {
    const { recipientEmail, giftType = "PRO_SUBSCRIPTION_MONTH" } = req.body;
    if (!recipientEmail) return res.status(400).json({ error: "Recipient email is required" });

    const giftCode = `GIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    res.json({ message: "Gift subscription code generated!", giftCode, recipientEmail, giftType });
  } catch (err) {
    next(err);
  }
});

export default router;
