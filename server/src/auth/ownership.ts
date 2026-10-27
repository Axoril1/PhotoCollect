/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Ownership & Scope Validation Infrastructure
 */

import { Response, NextFunction } from "express";
import { Roles, normalizeRole } from "./roles.js";

export type ResourceType = "event" | "photo" | "analytics" | "user" | "upload";

export interface UserContext {
  id: string;
  role: string;
  isSuspended?: boolean;
}

export interface ResourceOwnershipTarget {
  ownerId?: string | { toString(): string };
  uploaderId?: string | { toString(): string };
  userId?: string | { toString(): string };
  role?: string;
  _id?: string | { toString(): string };
}

/**
 * Validates whether a user owns or has authorized access to a specific resource.
 */
export function validateOwnership(
  user: UserContext,
  resourceType: ResourceType,
  resource: ResourceOwnershipTarget
): boolean {
  if (!user || !user.id) return false;

  const normalizedRole = normalizeRole(user.role);

  // SUPER_ADMIN has global access across all resources
  if (normalizedRole === Roles.SUPER_ADMIN) {
    return true;
  }

  // ADMIN rules
  if (normalizedRole === Roles.ADMIN) {
    // ADMIN cannot modify SUPER_ADMIN user accounts
    if (resourceType === "user" && resource) {
      const targetRole = normalizeRole(resource.role);
      if (targetRole === Roles.SUPER_ADMIN) {
        return false;
      }
    }
    // ADMIN can view/moderate events, photos, analytics, and non-super-admin users
    return true;
  }

  // ORGANIZER rules
  if (normalizedRole === Roles.ORGANIZER) {
    const userIdStr = user.id.toString();

    switch (resourceType) {
      case "event":
      case "analytics": {
        const ownerIdStr = resource.ownerId
          ? resource.ownerId.toString()
          : resource._id
          ? resource._id.toString()
          : null;
        return ownerIdStr === userIdStr;
      }

      case "photo":
      case "upload": {
        const ownerIdStr = resource.ownerId ? resource.ownerId.toString() : null;
        const uploaderIdStr = resource.uploaderId ? resource.uploaderId.toString() : null;
        return ownerIdStr === userIdStr || uploaderIdStr === userIdStr;
      }

      case "user": {
        const targetUserIdStr = resource.userId
          ? resource.userId.toString()
          : resource._id
          ? resource._id.toString()
          : null;
        return targetUserIdStr === userIdStr;
      }

      default:
        return false;
    }
  }

  // GUEST rules
  if (normalizedRole === Roles.GUEST) {
    const userIdStr = user.id.toString();

    if (resourceType === "photo" || resourceType === "upload") {
      const uploaderIdStr = resource.uploaderId ? resource.uploaderId.toString() : null;
      return uploaderIdStr === userIdStr;
    }

    if (resourceType === "user") {
      const targetUserIdStr = resource._id ? resource._id.toString() : null;
      return targetUserIdStr === userIdStr;
    }

    return false;
  }

  return false;
}

export interface RequireOwnershipOptions {
  resourceType: ResourceType;
  fetchResource: (req: any) => Promise<ResourceOwnershipTarget | null>;
  hideNotFound?: boolean; // Default true to prevent resource enumeration
}

/**
 * Express middleware factory for enforcing resource ownership.
 */
export function requireOwnership(options: RequireOwnershipOptions) {
  const { resourceType, fetchResource, hideNotFound = true } = options;

  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthenticated" });
      }

      const resource = await fetchResource(req);

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      const userContext: UserContext = {
        id: req.user.id || req.user._id,
        role: req.user.role,
        isSuspended: req.user.isSuspended,
      };

      const isOwner = validateOwnership(userContext, resourceType, resource);

      if (!isOwner) {
        // Prevent resource enumeration if hideNotFound is enabled
        if (hideNotFound) {
          return res.status(404).json({ error: "Resource not found" });
        }
        return res.status(403).json({ error: "Forbidden: Access denied to this resource" });
      }

      // Attach resource to req for downstream handler optimization
      req.resource = resource;
      next();
    } catch (err: any) {
      next(err);
    }
  };
}
