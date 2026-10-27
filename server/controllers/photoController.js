import { createRequire } from "module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import bcrypt from "bcryptjs";
import fs from "fs";
import Photo from "../models/Photo.js";
import Event from "../models/Event.js";
import { storageService } from "../services/storageService.js";
import { broadcastToEvent } from "../socket/socketServer.js";

const isOwner = (req, event) =>
  req.user && event.ownerId && event.ownerId.toString() === req.user._id.toString();

const cleanupUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (_) {}
    }
  });
};

const assertEventUsable = (event) => {
  if (event.expiresAt && event.expiresAt < new Date()) {
    const err = new Error("This event has expired");
    err.status = 410;
    throw err;
  }
};

const hasEventPasswordAccess = async (req, event) => {
  if (!event.password || isOwner(req, event)) return true;

  const suppliedPassword =
    req.get("x-event-password") ||
    req.body?.eventPassword ||
    req.body?.password ||
    "";

  if (!suppliedPassword) return false;
  return bcrypt.compare(suppliedPassword, event.password);
};

const requireEventAccess = async (req, res, event) => {
  const allowed = await hasEventPasswordAccess(req, event);
  if (!allowed) {
    res.status(401).json({
      error: "Event password required",
      requiresPassword: true,
    });
    return false;
  }
  return true;
};

export const uploadPhotos = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (event.expiresAt && event.expiresAt < new Date()) {
      cleanupUploadedFiles(req.files);
      return res.status(410).json({ error: "This event has expired" });
    }
    if (!(await requireEventAccess(req, res, event))) {
      cleanupUploadedFiles(req.files);
      return;
    }
    if (event.isClosed) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({ error: "This event is closed to new uploads" });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No photos uploaded" });
    }

    const currentPhotoCount = await Photo.countDocuments({ eventId: event._id });
    if (currentPhotoCount + req.files.length > event.uploadLimit) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        error: `This event has reached its ${event.uploadLimit} photo limit`,
      });
    }

    const uploaderName = req.body.uploaderName || "Guest";

    const processAndUploadSingleFile = async (file) => {
      const stored = await storageService.storePhoto(file, event, req);
      try {
        return await Photo.create({
          eventId: event._id,
          filename: stored.filename,
          originalName: file.originalname || "photo.jpg",
          originalUrl: stored.originalUrl,
          thumbnailUrl: stored.thumbnailUrl,
          uploaderName,
          sizeBytes: file.size,
          storageProvider: stored.storageProvider,
        });
      } catch (err) {
        try {
          await storageService.deletePhoto(stored.filename, stored.storageProvider);
        } catch (delErr) {
          console.error(`Failed to clean up storage after DB save error:`, delErr);
        }
        throw err;
      }
    };

    const uploadPromises = req.files.map((file) => processAndUploadSingleFile(file));
    const savedPhotos = await Promise.all(uploadPromises);

    // Record usage for event owner
    try {
      const usageService = (await import("../services/usageService.js")).default;
      const totalBytes = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
      await usageService.recordUpload(event.ownerId, totalBytes);
    } catch (usageErr) {
      console.error("[PhotoUpload] Non-fatal usage recording error:", usageErr.message);
    }

    // Calculate new event statistics (Phase 4 & 6)
    const stats = await Photo.aggregate([
      { $match: { eventId: event._id } },
      { $group: { _id: null, totalSize: { $sum: "$sizeBytes" }, count: { $sum: 1 } } }
    ]);
    const photoCount = stats[0]?.count || 0;
    const storageBytes = stats[0]?.totalSize || 0;

    // Broadcast photo upload event (Phase 4)
    broadcastToEvent(event._id, "photo_uploaded", {
      photos: savedPhotos,
      photoCount,
      storageBytes,
      uploaderName,
      timestamp: new Date().toISOString()
    });

    // Broadcast activity log entry (Phase 5)
    broadcastToEvent(event._id, "new_activity", {
      id: `upload-${Date.now()}`,
      type: "upload",
      text: `${uploaderName} uploaded ${savedPhotos.length} photo${savedPhotos.length > 1 ? "s" : ""}`,
      userName: uploaderName,
      count: savedPhotos.length,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ message: `${savedPhotos.length} photo(s) uploaded`, photos: savedPhotos });
  } catch (err) {
    next(err);
  }
};

export const getEventPhotos = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    assertEventUsable(event);
    if (!(await requireEventAccess(req, res, event))) return;

    const photos = await Photo.find({ eventId: event._id }).sort({ createdAt: -1 });
    res.json({ count: photos.length, photos });
  } catch (err) {
    next(err);
  }
};

export const deletePhoto = async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const event = await Event.findById(photo.eventId);
    if (!event || !isOwner(req, event)) {
      return res.status(403).json({ error: "You do not have permission to delete this photo" });
    }

    await storageService.deletePhoto(photo.filename, photo.storageProvider || "local");
    await photo.deleteOne();

    try {
      const usageService = (await import("../services/usageService.js")).default;
      await usageService.recordDeletion(event.ownerId, photo.sizeBytes || 0);
    } catch (err) {
      console.error("[PhotoDelete] Metering error:", err.message);
    }

    res.json({ message: "Photo deleted" });
  } catch (err) {
    next(err);
  }
};

export const downloadAllPhotos = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    assertEventUsable(event);
    if (!(await requireEventAccess(req, res, event))) return;

    const photos = await Photo.find({ eventId: event._id });
    if (photos.length === 0) {
      return res.status(404).json({ error: "No photos to download" });
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        next(err);
      }
    });

    res.attachment(`${event.name.replace(/[^a-z0-9]/gi, "_")}_photos.zip`);
    archive.pipe(res);

    for (const photo of photos) {
      try {
        const stream = await storageService.getFileStream(photo.filename, "originals", photo.storageProvider || "local");
        archive.append(stream, { name: photo.originalName || photo.filename });
      } catch (err) {
        console.error(`Failed to stream photo ${photo.filename} for download zip:`, err);
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
};

export const downloadSelectedPhotos = async (req, res, next) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: "photoIds array is required" });
    }

    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    assertEventUsable(event);
    if (!(await requireEventAccess(req, res, event))) return;

    const photos = await Photo.find({
      _id: { $in: photoIds },
      eventId: event._id,
    });

    if (photos.length === 0) {
      return res.status(404).json({ error: "No matching photos found" });
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        next(err);
      }
    });

    res.attachment(`${event.name.replace(/[^a-z0-9]/gi, "_")}_selected_photos.zip`);
    archive.pipe(res);

    for (const photo of photos) {
      try {
        const stream = await storageService.getFileStream(photo.filename, "originals", photo.storageProvider || "local");
        archive.append(stream, { name: photo.originalName || photo.filename });
      } catch (err) {
        console.error(`Failed to stream photo ${photo.filename} for download selected zip:`, err);
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
};
