import express from "express";
import { upload } from "../middleware/upload.js";
import { optionalAuth } from "../middleware/auth.js";
import { uploadLimiter, apiWriteLimiter, downloadLimiter } from "../middleware/rateLimits.js";
import {
  uploadPhotos,
  getEventPhotos,
  deletePhoto,
  downloadAllPhotos,
  downloadSelectedPhotos,
} from "../controllers/photoController.js";
import {
  validateObjectId,
  validateSlug,
  validateDownloadSelected,
} from "../middleware/validation.js";
import { authorize } from "../src/auth/authorize.js";
import { Permissions } from "../src/auth/permissions.js";
import Photo from "../models/Photo.js";
import Event from "../models/Event.js";

const router = express.Router();

router.post("/:slug", optionalAuth, uploadLimiter, validateSlug("slug"), upload.array("photos", 20), uploadPhotos);
router.get("/:slug", optionalAuth, validateSlug("slug"), getEventPhotos);

router.delete(
  "/:id",
  authorize({
    permissions: Permissions.UPLOADS_DELETE,
    ownership: {
      resourceType: "photo",
      fetchResource: async (req) => {
        const photo = await Photo.findById(req.params.id);
        if (!photo) return null;
        const event = await Event.findById(photo.eventId);
        return {
          _id: photo._id,
          eventId: photo.eventId,
          ownerId: event ? event.ownerId : null,
          uploaderId: photo.uploaderId,
        };
      },
      hideNotFound: true,
    },
  }),
  apiWriteLimiter,
  validateObjectId("id"),
  deletePhoto
);

router.get("/:slug/download", optionalAuth, downloadLimiter, validateSlug("slug"), downloadAllPhotos);
router.post("/:slug/download-selected", optionalAuth, downloadLimiter, validateSlug("slug"), validateDownloadSelected, downloadSelectedPhotos);

export default router;
