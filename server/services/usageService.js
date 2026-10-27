/**
 * QR Snap - Comprehensive Real-Time Metering & Quota Service
 */

import Usage from "../models/Usage.js";
import SubscriptionUsage from "../models/SubscriptionUsage.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import Event from "../models/Event.js";
import Photo from "../models/Photo.js";

/**
 * Get or initialize user Usage document
 */
export async function getUserUsage(userId) {
  let usage = await Usage.findOne({ owner: userId });

  if (!usage) {
    usage = await recalculateUserUsage(userId);
  }

  return usage;
}

/**
 * Real-time Meter: Image Uploaded (Atomic Incremental)
 */
export async function recordUpload(userId, fileSizeBytes = 0) {
  const bytes = Math.max(0, fileSizeBytes);

  const [usage] = await Promise.all([
    Usage.findOneAndUpdate(
      { owner: userId },
      {
        $inc: { imageCount: 1, currentStorageBytes: bytes },
        $set: { lastCalculatedAt: new Date() },
      },
      { new: true, upsert: true }
    ),
    SubscriptionUsage.findOneAndUpdate(
      { userId },
      {
        $inc: { imagesUploaded: 1, storageBytes: bytes, uploadsToday: 1 },
        $set: { lastUploadAt: new Date() },
      },
      { new: true, upsert: true }
    ),
  ]);

  await updateWarningLevel(userId, usage);
  return usage;
}

/**
 * Real-time Meter: Image Deleted / Storage Cleanup (Atomic Decrement)
 */
export async function recordDeletion(userId, fileSizeBytes = 0) {
  const bytes = Math.max(0, fileSizeBytes);

  const usage = await Usage.findOneAndUpdate(
    { owner: userId },
    {
      $inc: {
        imageCount: -1,
        currentStorageBytes: -bytes,
      },
      $set: { lastCalculatedAt: new Date() },
    },
    { new: true, upsert: true }
  );

  // Ensure counters don't drop below 0
  if (usage.currentStorageBytes < 0 || usage.imageCount < 0) {
    usage.currentStorageBytes = Math.max(0, usage.currentStorageBytes);
    usage.imageCount = Math.max(0, usage.imageCount);
    await usage.save();
  }

  await updateWarningLevel(userId, usage);
  return usage;
}

/**
 * Real-time Meter: Bulk ZIP Download
 */
export async function recordDownload(userId, bytesDownloaded = 0) {
  return await Usage.findOneAndUpdate(
    { owner: userId },
    {
      $inc: { downloadCount: 1, bandwidthBytes: Math.max(0, bytesDownloaded) },
    },
    { new: true, upsert: true }
  );
}

/**
 * Real-time Meter: AI Moderation Request
 */
export async function recordAIRequest(userId) {
  return await Usage.findOneAndUpdate(
    { owner: userId },
    { $inc: { aiRequests: 1 } },
    { new: true, upsert: true }
  );
}

/**
 * Calculate & Update Warning Thresholds (50%, 75%, 90%, 100%)
 */
export async function updateWarningLevel(userId, usageDoc) {
  const sub = await Subscription.findOne({ owner: userId }).populate("plan").lean();
  const plan = sub?.plan || (await Plan.findOne({ slug: "free" }).lean());
  const maxStorageBytes = ((plan?.limits?.maxStorageGB || 1) + (usageDoc.tempQuotaBonusGB || 0)) * 1024 * 1024 * 1024;

  const usagePercent = Math.min(100, (usageDoc.currentStorageBytes / maxStorageBytes) * 100);

  let newLevel = "NORMAL";
  if (usagePercent >= 100) newLevel = "EXCEEDED_100";
  else if (usagePercent >= 90) newLevel = "WARNING_90";
  else if (usagePercent >= 75) newLevel = "WARNING_75";
  else if (usagePercent >= 50) newLevel = "WARNING_50";

  if (usageDoc.warningLevel !== newLevel) {
    usageDoc.warningLevel = newLevel;
    await usageDoc.save();
  }
}

/**
 * Full Recalculation Engine (Scans raw collections to repair drift)
 */
export async function recalculateUserUsage(userId) {
  const [eventsCount, photoAgg] = await Promise.all([
    Event.countDocuments({ ownerId: userId }),
    Photo.aggregate([
      { $match: { uploaderId: userId } },
      { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: "$sizeBytes" } } },
    ]),
  ]);

  const photoCount = photoAgg.length > 0 ? photoAgg[0].count : 0;
  const storageBytes = photoAgg.length > 0 ? photoAgg[0].bytes : 0;

  const [usage] = await Promise.all([
    Usage.findOneAndUpdate(
      { owner: userId },
      {
        $set: {
          eventCount: eventsCount,
          imageCount: photoCount,
          currentStorageBytes: storageBytes,
          lastCalculatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    ),
    SubscriptionUsage.findOneAndUpdate(
      { userId },
      {
        $set: {
          eventsCreated: eventsCount,
          imagesUploaded: photoCount,
          storageBytes,
        },
      },
      { new: true, upsert: true }
    ),
  ]);

  await updateWarningLevel(userId, usage);
  return usage;
}

/**
 * Admin Grant Temporary Quota Bonus
 */
export async function grantTempQuota(userId, bonusGB = 5) {
  const usage = await Usage.findOneAndUpdate(
    { owner: userId },
    { $inc: { tempQuotaBonusGB: Math.max(0, bonusGB) } },
    { new: true, upsert: true }
  );

  await updateWarningLevel(userId, usage);
  return usage;
}

/**
 * Quota Check Methods
 */
export async function canCreateEvent(userId) {
  const sub = await Subscription.findOne({ owner: userId, status: { $in: ["ACTIVE", "TRIAL"] } }).populate("plan").lean();
  const plan = sub?.plan || (await Plan.findOne({ slug: "free" }).lean());
  const maxEvents = plan ? plan.limits.maxEvents : 1;

  if (maxEvents === -1) return true;

  const currentEvents = await Event.countDocuments({ ownerId: userId });
  return currentEvents < maxEvents;
}

export async function canUploadImages(userId, count = 1, fileSizeBytes = 0) {
  const sub = await Subscription.findOne({ owner: userId, status: { $in: ["ACTIVE", "TRIAL"] } }).populate("plan").lean();
  const plan = sub?.plan || (await Plan.findOne({ slug: "free" }).lean());
  const usage = await getUserUsage(userId);

  const totalAllowedGB = (plan?.limits?.maxStorageGB || 1) + (usage.tempQuotaBonusGB || 0);
  const maxStorageBytes = totalAllowedGB * 1024 * 1024 * 1024;

  if (usage.currentStorageBytes + fileSizeBytes > maxStorageBytes) {
    return {
      allowed: false,
      reason: `Storage quota of ${totalAllowedGB} GB exceeded (Soft/Hard Limit reached).`,
    };
  }

  const maxImages = plan?.limits?.maxImages || 500;
  if (maxImages !== -1 && usage.imageCount + count > maxImages) {
    return {
      allowed: false,
      reason: `Image quota of ${maxImages} photos exceeded.`,
    };
  }

  return { allowed: true };
}

export default {
  getUserUsage,
  recordUpload,
  recordDeletion,
  recordDownload,
  recordAIRequest,
  recalculateUserUsage,
  grantTempQuota,
  canCreateEvent,
  canUploadImages,
};
