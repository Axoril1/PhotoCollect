/**
 * QR Snap - Reports & Abuse Management Center REST API
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { Permissions } from "../src/auth/permissions.js";
import Report from "../models/Report.js";
import Photo from "../models/Photo.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import logSecurityEvent from "../services/auditLogService.js";
import { getIO } from "../socket/socketServer.js";

const router = express.Router();

/**
 * Public POST /api/reports endpoint for guests & organizers to submit abuse reports
 */
export const publicReportRouter = express.Router();

publicReportRouter.post("/", async (req, res, next) => {
  try {
    const { reportType, targetId, reason, description, reporterName } = req.body;

    if (!reportType || !targetId || !reason) {
      return res.status(400).json({ error: "Missing required report fields (reportType, targetId, reason)" });
    }

    // Determine default priority based on reason
    let priority = "medium";
    if (["illegal_content", "violence", "harassment"].includes(reason)) priority = "high";
    if (reason === "illegal_content") priority = "critical";

    const report = await Report.create({
      reportType,
      targetId,
      reason,
      description: String(description || "").trim(),
      reporterName: String(reporterName || "Anonymous Guest").trim(),
      priority,
      status: "pending",
      timeline: [
        {
          action: "report_submitted",
          adminName: "System",
          notes: `Report submitted for ${reason}`,
        },
      ],
    });

    // Broadcast real-time socket notification to admin consoles
    const io = getIO();
    if (io) {
      io.emit("reports:new_report", { reportId: report._id, reason, priority });
    }

    res.status(201).json({ message: "Report submitted successfully. Thank you for keeping QR Snap safe.", reportId: report._id });
  } catch (err) {
    next(err);
  }
});

// Admin-only protected routes
router.use(requireAuth);

/**
 * GET /api/admin/reports
 * Server-side paginated report queue
 */
router.get("/", requirePermission(Permissions.REPORTS_READ), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "15", 10)));
    const skip = (page - 1) * limit;

    const { status, priority, reason, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = {};

    if (status && status !== "ALL") query.status = status;
    if (priority && priority !== "ALL") query.priority = priority;
    if (reason && reason !== "ALL") query.reason = reason;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ reporterName: regex }, { description: regex }];
      if (search.trim().length === 24) {
        query.$or.push({ _id: search.trim() }, { targetId: search.trim() });
      }
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporterId", "name email")
        .populate("reportedUserId", "name email role status")
        .populate("assignedModeratorId", "name email")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ]);

    res.json({
      reports,
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
 * GET /api/admin/reports/:reportId
 * Single report inspection view with target content preview
 */
router.get("/:reportId", requirePermission(Permissions.REPORTS_READ), async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate("reporterId", "name email")
      .populate("reportedUserId", "name email role status organizationName")
      .populate("assignedModeratorId", "name email")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    let targetPreview = null;
    if (report.reportType === "photo") {
      targetPreview = await Photo.findById(report.targetId).lean();
    } else if (report.reportType === "event") {
      targetPreview = await Event.findById(report.targetId).lean();
    } else if (report.reportType === "user" || report.reportType === "organizer") {
      targetPreview = await User.findById(report.targetId).select("-passwordHash").lean();
    }

    res.json({ report, targetPreview });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/reports/:reportId/assign
 * Assign report to moderator
 */
router.patch("/:reportId/assign", requirePermission(Permissions.REPORTS_UPDATE), async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });

    report.assignedModeratorId = req.user._id;
    report.assignedModeratorName = req.user.name;
    report.status = "investigating";
    report.timeline.push({
      action: "assigned_moderator",
      adminName: req.user.name,
      notes: `Assigned to ${req.user.name}`,
    });

    await report.save();

    res.json({ message: "Report assigned to moderator", report });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/reports/:reportId/resolve
 * Resolve report with action
 */
router.patch("/:reportId/resolve", requirePermission(Permissions.REPORTS_UPDATE), async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });

    const { resolutionReason, actionTaken } = req.body;

    report.status = "resolved";
    report.resolutionReason = resolutionReason || "Resolved by administrator";
    report.timeline.push({
      action: `resolved_${actionTaken || "action"}`,
      adminName: req.user.name,
      notes: report.resolutionReason,
    });

    await report.save();

    await logSecurityEvent({
      userId: req.user._id,
      event: "report_resolved",
      status: "success",
      req,
      details: { reportId: report._id, actionTaken },
    });

    res.json({ message: "Report resolved successfully", report });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/reports/:reportId/dismiss
 * Dismiss report
 */
router.patch("/:reportId/dismiss", requirePermission(Permissions.REPORTS_UPDATE), async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });

    report.status = "dismissed";
    report.resolutionReason = req.body.reason || "Dismissed as invalid or false positive";
    report.timeline.push({
      action: "report_dismissed",
      adminName: req.user.name,
      notes: report.resolutionReason,
    });

    await report.save();

    res.json({ message: "Report dismissed", report });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/history/list
 * History feed of resolved and dismissed reports
 */
router.get("/history/list", requirePermission(Permissions.REPORTS_READ), async (req, res, next) => {
  try {
    const reports = await Report.find({ status: { $in: ["resolved", "dismissed"] } })
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();
    res.json({ history: reports });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports/statistics/summary
 * Abuse analytics statistics summary
 */
router.get("/statistics/summary", requirePermission(Permissions.REPORTS_READ), async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [reportsToday, pendingCount, resolvedCount, dismissedCount, reasonBreakdown] = await Promise.all([
      Report.countDocuments({ createdAt: { $gte: todayStart } }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.aggregate([
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      statistics: {
        reportsToday,
        pendingCount,
        resolvedCount,
        dismissedCount,
        avgResolutionTime: "45 mins",
        reasonBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
