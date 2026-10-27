/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Protected Organizer Routes (/api/organizer)
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../src/auth/requirePermission.js";
import { authorize } from "../src/auth/authorize.js";
import { Permissions } from "../src/auth/permissions.js";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/organizer/events
 * View organizer's owned events
 */
router.get(
  "/events",
  requirePermission(Permissions.EVENTS_READ),
  async (req, res, next) => {
    try {
      const events = await Event.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
      res.json({ events });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/organizer/analytics
 * View overall analytics for organizer's events
 */
router.get(
  "/analytics",
  requirePermission(Permissions.ANALYTICS_READ),
  async (req, res, next) => {
    try {
      const userEvents = await Event.find({ ownerId: req.user._id }).select("_id");
      const eventIds = userEvents.map((e) => e._id);

      const totalPhotos = await Photo.countDocuments({ eventId: { $in: eventIds } });

      res.json({
        analytics: {
          totalEvents: userEvents.length,
          totalPhotos,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/organizer/events/:id/analytics
 * View analytics for a specific event with ownership validation
 */
router.get(
  "/events/:id/analytics",
  authorize({
    permissions: Permissions.ANALYTICS_READ,
    ownership: {
      resourceType: "event",
      fetchResource: async (req) => {
        return Event.findById(req.params.id);
      },
      hideNotFound: true, // Hide event existence from unauthorized organizers
    },
  }),
  async (req, res, next) => {
    try {
      const event = req.resource;
      const photoCount = await Photo.countDocuments({ eventId: event._id });

      res.json({
        event: {
          id: event._id,
          name: event.name,
          slug: event.slug,
          uploadLimit: event.uploadLimit,
        },
        analytics: {
          photoCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
