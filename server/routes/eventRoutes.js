import express from "express";
import {
  createEvent,
  getMyEvents,
  getEvent,
  verifyEventPassword,
  closeEvent,
  updateEventBranding,
  uploadEventBrandingAsset,
} from "../controllers/eventController.js";
import { requireAuth } from "../middleware/auth.js";
import { apiWriteLimiter } from "../middleware/rateLimits.js";
import { upload } from "../middleware/upload.js";
import {
  validateSlug,
  validateCreateEvent,
  validateVerifyPassword,
} from "../middleware/validation.js";
import { authorize } from "../src/auth/authorize.js";
import { Permissions } from "../src/auth/permissions.js";
import Event from "../models/Event.js";

const router = express.Router();

const fetchEventBySlug = async (req) => {
  return Event.findOne({ slug: req.params.slug });
};

router.post(
  "/",
  authorize({ permissions: Permissions.EVENTS_CREATE }),
  apiWriteLimiter,
  validateCreateEvent,
  createEvent
);

router.get(
  "/mine/list",
  authorize({ permissions: Permissions.EVENTS_READ }),
  getMyEvents
);

router.get("/:slug", validateSlug("slug"), getEvent);

router.post(
  "/:slug/verify-password",
  apiWriteLimiter,
  validateSlug("slug"),
  validateVerifyPassword,
  verifyEventPassword
);

router.patch(
  "/:slug/close",
  authorize({
    permissions: Permissions.EVENTS_UPDATE,
    ownership: { resourceType: "event", fetchResource: fetchEventBySlug, hideNotFound: true },
  }),
  apiWriteLimiter,
  validateSlug("slug"),
  closeEvent
);

router.patch(
  "/:slug/branding",
  authorize({
    permissions: Permissions.EVENTS_UPDATE,
    ownership: { resourceType: "event", fetchResource: fetchEventBySlug, hideNotFound: true },
  }),
  apiWriteLimiter,
  validateSlug("slug"),
  updateEventBranding
);

router.patch(
  "/:slug/branding/upload",
  authorize({
    permissions: Permissions.EVENTS_UPDATE,
    ownership: { resourceType: "event", fetchResource: fetchEventBySlug, hideNotFound: true },
  }),
  apiWriteLimiter,
  validateSlug("slug"),
  upload.single("file"),
  uploadEventBrandingAsset
);

export default router;
