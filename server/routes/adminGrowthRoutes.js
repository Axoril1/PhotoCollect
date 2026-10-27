/**
 * QR Snap - Admin Growth Engine Governance REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import Coupon from "../models/Coupon.js";
import Campaign from "../models/Campaign.js";
import growthService from "../services/growthService.js";
import logSecurityEvent from "../services/auditLogService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/admin/growth-center/coupons
 */
router.get("/coupons", requirePermission(Permissions.SETTINGS_READ), async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/growth-center/coupons
 */
router.post("/coupons", requirePermission(Permissions.SETTINGS_UPDATE), async (req, res, next) => {
  try {
    const { code, discountType, discountValue, maxRedemptions = 100 } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: "code, discountType, and discountValue are required" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxRedemptions,
      isActive: true,
    });

    await logSecurityEvent({
      userId: req.user._id,
      event: "admin_coupon_created",
      status: "success",
      req,
      details: { code, discountType, discountValue },
    });

    res.json({ message: "Coupon created successfully", coupon });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/growth-center/wallet/credit
 */
router.post("/wallet/credit", requirePermission(Permissions.USERS_UPDATE), async (req, res, next) => {
  try {
    const { userId, amountCents, description = "Admin promotional credit" } = req.body;
    if (!userId || !amountCents) {
      return res.status(400).json({ error: "userId and amountCents are required" });
    }

    const wallet = await growthService.creditWallet(userId, amountCents, "ADMIN_CREDIT", description);

    res.json({ message: "Wallet credited successfully", wallet });
  } catch (err) {
    next(err);
  }
});

export default router;
