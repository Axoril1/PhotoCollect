/**
 * QR Snap - Organizer Analytics & Business Intelligence Engine
 */

import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";
import Usage from "../models/Usage.js";
import Subscription from "../models/Subscription.js";

/**
 * Record a granular analytics event
 */
export async function trackEvent({
  ownerId,
  eventId = null,
  type,
  device = "Desktop",
  browser = "Chrome",
  os = "Windows",
  country = "Unknown",
  metadata = {},
}) {
  try {
    const record = await AnalyticsEvent.create({
      ownerId,
      eventId,
      type,
      device,
      browser,
      os,
      country,
      metadata,
      timestamp: new Date(),
    });
    return record;
  } catch (err) {
    console.error("[AnalyticsService] Error recording event:", err.message);
    return null;
  }
}

/**
 * Overview KPIs for Organizer Dashboard
 */
export async function getOverview(userId, { startDate, endDate } = {}) {
  const matchQuery = { ownerId: userId };
  if (startDate || endDate) {
    matchQuery.timestamp = {};
    if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
    if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
  }

  const [
    totalEvents,
    activeEvents,
    archivedEvents,
    usageDoc,
    subDoc,
    qrScans,
    galleryViews,
    downloadsCount,
  ] = await Promise.all([
    Event.countDocuments({ ownerId: userId }),
    Event.countDocuments({ ownerId: userId, isClosed: false }),
    Event.countDocuments({ ownerId: userId, isClosed: true }),
    Usage.findOne({ owner: userId }).lean(),
    Subscription.findOne({ owner: userId }).populate("plan").lean(),
    AnalyticsEvent.countDocuments({ ...matchQuery, type: "QR_SCAN" }),
    AnalyticsEvent.countDocuments({ ...matchQuery, type: "GALLERY_VIEW" }),
    AnalyticsEvent.countDocuments({ ...matchQuery, type: { $in: ["DOWNLOAD", "ZIP_DOWNLOAD"] } }),
  ]);

  const limits = subDoc?.plan?.limits || { maxEvents: 1, maxStorageGB: 2, maxImages: 500 };
  const currentStorage = usageDoc?.currentStorageBytes || 0;
  const maxStorageBytes = (limits.maxStorageGB || 1) * 1024 * 1024 * 1024;

  return {
    totalEvents,
    activeEvents,
    archivedEvents,
    guestsJoined: qrScans + galleryViews,
    imagesUploaded: usageDoc?.imageCount || 0,
    imagesApproved: usageDoc?.imageCount || 0,
    imagesRejected: 0,
    downloads: downloadsCount,
    qrScans,
    galleryViews,
    storageUsedBytes: currentStorage,
    storageRemainingBytes: Math.max(0, maxStorageBytes - currentStorage),
    subscription: {
      planName: subDoc?.plan?.name || "Free Tier",
      status: subDoc?.status || "ACTIVE",
      renewalDate: subDoc?.expiresAt,
    },
  };
}

/**
 * Event-level analytics aggregation
 */
export async function getEventAnalytics(userId) {
  const events = await Event.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();

  const eventStats = await Promise.all(
    events.map(async (e) => {
      const [photoStats, qrScans, views, downloads] = await Promise.all([
        Photo.aggregate([
          { $match: { eventId: e._id } },
          { $group: { _id: null, count: { $sum: 1 }, sizeBytes: { $sum: "$sizeBytes" } } },
        ]),
        AnalyticsEvent.countDocuments({ eventId: e._id, type: "QR_SCAN" }),
        AnalyticsEvent.countDocuments({ eventId: e._id, type: "GALLERY_VIEW" }),
        AnalyticsEvent.countDocuments({ eventId: e._id, type: { $in: ["DOWNLOAD", "ZIP_DOWNLOAD"] } }),
      ]);

      const photoCount = photoStats[0]?.count || 0;
      const storageBytes = photoStats[0]?.sizeBytes || 0;

      return {
        id: e._id,
        name: e.name,
        slug: e.slug,
        isClosed: e.isClosed,
        createdAt: e.createdAt,
        photoCount,
        storageBytes,
        qrScans,
        views,
        downloads,
      };
    })
  );

  return { events: eventStats };
}

/**
 * Storage consumption analytics over time
 */
export async function getStorageAnalytics(userId) {
  const usage = await Usage.findOne({ owner: userId }).lean();
  const events = await Event.find({ ownerId: userId }).select("_id name").lean();

  const storageByEvent = await Promise.all(
    events.map(async (e) => {
      const stats = await Photo.aggregate([
        { $match: { eventId: e._id } },
        { $group: { _id: null, totalBytes: { $sum: "$sizeBytes" }, count: { $sum: 1 } } },
      ]);

      return {
        eventName: e.name,
        storageBytes: stats[0]?.totalBytes || 0,
        photoCount: stats[0]?.count || 0,
      };
    })
  );

  return {
    totalStorageBytes: usage?.currentStorageBytes || 0,
    storageByEvent,
  };
}

/**
 * Upload velocity & distribution analytics
 */
export async function getUploadAnalytics(userId) {
  const events = await Event.find({ ownerId: userId }).select("_id").lean();
  const eventIds = events.map((e) => e._id);

  const uploadsPerDay = await Photo.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        totalBytes: { $sum: "$sizeBytes" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return { uploadsPerDay };
}

/**
 * QR Code Scan & Audience Demographics Analytics
 */
export async function getQRAnalytics(userId) {
  const [deviceBreakdown, browserBreakdown, osBreakdown, dailyScans] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { ownerId: userId, type: "QR_SCAN" } },
      { $group: { _id: "$device", count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ownerId: userId, type: "QR_SCAN" } },
      { $group: { _id: "$browser", count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ownerId: userId, type: "QR_SCAN" } },
      { $group: { _id: "$os", count: { $sum: 1 } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ownerId: userId, type: "QR_SCAN" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    dailyScans,
  };
}

/**
 * AI Moderation Metrics
 */
export async function getAIAnalytics(userId) {
  const usage = await Usage.findOne({ owner: userId }).lean();

  return {
    aiRequests: usage?.aiRequests || 0,
    approvedImages: usage?.imageCount || 0,
    rejectedImages: 0,
    avgProcessingTimeMs: 420,
  };
}

/**
 * Generate CSV Report Export
 */
export async function exportAnalyticsCSV(userId) {
  const eventStats = await getEventAnalytics(userId);
  let csv = "Event Name,Slug,Status,Photos Uploaded,Storage Used (Bytes),QR Scans,Gallery Views,Downloads\n";

  eventStats.events.forEach((e) => {
    csv += `"${e.name}","${e.slug}","${e.isClosed ? "Archived" : "Active"}",${e.photoCount},${e.storageBytes},${e.qrScans},${e.views},${e.downloads}\n`;
  });

  return csv;
}

export default {
  trackEvent,
  getOverview,
  getEventAnalytics,
  getStorageAnalytics,
  getUploadAnalytics,
  getQRAnalytics,
  getAIAnalytics,
  exportAnalyticsCSV,
};
