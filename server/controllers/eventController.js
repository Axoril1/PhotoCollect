import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import os from "os";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";
import { storageService } from "../services/storageService.js";
import { broadcastToEvent } from "../socket/socketServer.js";

const getEventShareData = async (slug) => {
  let clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  if (clientUrl.includes("localhost") || clientUrl.includes("127.0.0.1")) {
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== "localhost") break;
    }
    clientUrl = clientUrl.replace("localhost", localIp).replace("127.0.0.1", localIp);
  }
  const eventUrl = `${clientUrl}/event/${slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
    width: 400,
    margin: 2,
  });
  return { eventUrl, qrCodeDataUrl };
};

export const createEvent = async (req, res, next) => {
  try {
    const { name, organizerName, password, expiresInDays } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }

    const slug = nanoid(8);

    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let expiresAt = null;
    if (expiresInDays) {
      const days = Number(expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return res.status(400).json({ error: "Expiry must be between 1 and 365 days" });
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const event = await Event.create({
      name: name.trim(),
      slug,
      ownerId: req.user._id,
      organizerName: organizerName || "",
      password: hashedPassword,
      expiresAt,
      planSnapshot: req.user.plan,
      uploadLimit: req.user.plan === "free" ? 100 : 1000,
    });

    const { eventUrl, qrCodeDataUrl } = await getEventShareData(slug);

    res.status(201).json({
      event: {
        id: event._id,
        name: event.name,
        slug: event.slug,
        createdAt: event.createdAt,
        hasPassword: !!hashedPassword,
        uploadLimit: event.uploadLimit,
        branding: event.branding || {},
      },
      eventUrl,
      qrCodeDataUrl,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ ownerId: req.user._id }).sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      events.map(async (event) => {
        const photoCount = await Photo.countDocuments({ eventId: event._id });
        const { eventUrl, qrCodeDataUrl } = await getEventShareData(event.slug);
        return {
          id: event._id,
          name: event.name,
          slug: event.slug,
          isClosed: event.isClosed,
          hasPassword: !!event.password,
          expiresAt: event.expiresAt,
          photoCount,
          uploadLimit: event.uploadLimit,
          createdAt: event.createdAt,
          eventUrl,
          qrCodeDataUrl,
          branding: event.branding || {},
        };
      })
    );

    res.json({ events: withCounts });
  } catch (err) {
    next(err);
  }
};

export const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.expiresAt && event.expiresAt < new Date()) {
      return res.status(410).json({ error: "This event has expired" });
    }

    const photoCount = await Photo.countDocuments({ eventId: event._id });

    res.json({
      id: event._id,
      name: event.name,
      slug: event.slug,
      date: event.date,
      isClosed: event.isClosed,
      hasPassword: !!event.password,
      photoCount,
      uploadLimit: event.uploadLimit,
      branding: event.branding || {},
      ownerId: event.ownerId,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEventPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (!event.password) {
      return res.json({ valid: true });
    }
    const valid = await bcrypt.compare(password || "", event.password);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
};

export const closeEvent = async (req, res, next) => {
  try {
    const event = await Event.findOneAndUpdate(
      { slug: req.params.slug, ownerId: req.user._id },
      { isClosed: true },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ error: "Event not found or you do not own it" });
    }

    // Broadcast event status change and activity (Phase 5)
    broadcastToEvent(event._id, "event_closed", {
      isClosed: true,
      timestamp: new Date().toISOString()
    });

    broadcastToEvent(event._id, "new_activity", {
      id: `close-${Date.now()}`,
      type: "close",
      text: "Event closed",
      timestamp: new Date().toISOString()
    });

    res.json({ message: "Event closed to new uploads", event });
  } catch (err) {
    next(err);
  }
};

export const updateEventBranding = async (req, res, next) => {
  try {
    const { branding } = req.body;
    const event = await Event.findOneAndUpdate(
      { slug: req.params.slug, ownerId: req.user._id },
      { branding },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ error: "Event not found or you do not own it" });
    }
    res.json({ message: "Branding updated successfully", branding: event.branding });
  } catch (err) {
    next(err);
  }
};

export const uploadEventBrandingAsset = async (req, res, next) => {
  try {
    const event = await Event.findOne({ slug: req.params.slug, ownerId: req.user._id });
    if (!event) {
      return res.status(404).json({ error: "Event not found or you do not own it" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { assetType } = req.body;
    if (assetType !== "logo" && assetType !== "cover") {
      return res.status(400).json({ error: "Invalid assetType. Must be 'logo' or 'cover'" });
    }

    const stored = await storageService.storeBrandingAsset(req.file, event, req, assetType);
    
    const updatedBranding = { ...event.branding };
    if (assetType === "logo") {
      updatedBranding.logo = stored.url;
    } else {
      updatedBranding.coverImage = stored.url;
    }

    event.branding = updatedBranding;
    await event.save();

    res.json({
      message: "Branding asset uploaded successfully",
      url: stored.url,
      branding: event.branding
    });
  } catch (err) {
    next(err);
  }
};
