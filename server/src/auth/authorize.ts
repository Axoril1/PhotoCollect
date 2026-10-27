/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Composite Authorization Infrastructure
 *
 * Supports composition of authentication, roles, permissions, and resource ownership checks.
 */

import { Request, Response, NextFunction } from "express";
import { Role, Roles, normalizeRole, isRoleAtLeast } from "./roles.js";
import { Permission } from "./permissions.js";
import { permissionCache } from "./permissionCache.js";
import { validateOwnership, ResourceType, ResourceOwnershipTarget } from "./ownership.js";

export interface AuthorizeOptions {
  roles?: Role | Role[];
  permissions?: Permission | Permission[];
  requireAllPermissions?: boolean;
  ownership?: {
    resourceType: ResourceType;
    fetchResource: (req: Request) => Promise<ResourceOwnershipTarget | null>;
    hideNotFound?: boolean; // Default: true to prevent resource enumeration
  };
  allowSuperAdminOverride?: boolean; // Default: true
}

/**
 * Composite Authorization Middleware.
 * Combines authentication verification, role validation, permission evaluation, and resource ownership checks.
 */
export function authorize(options: AuthorizeOptions = {}) {
  const {
    roles,
    permissions,
    requireAllPermissions = false,
    ownership,
    allowSuperAdminOverride = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      // 1. Authentication Check
      if (!user) {
        return res.status(401).json({ error: "Unauthenticated: Authentication required" });
      }

      // 2. Account Status Check
      if (user.isSuspended) {
        return res.status(403).json({ error: "Forbidden: Account is suspended" });
      }

      const userRole = normalizeRole(user.role);

      // Super Admin Global Override
      if (allowSuperAdminOverride && userRole === Roles.SUPER_ADMIN) {
        if (ownership) {
          const resource = await ownership.fetchResource(req);
          if (!resource) {
            return res.status(404).json({ error: "Resource not found" });
          }
          (req as any).resource = resource;
        }
        return next();
      }

      // 3. Role Hierarchy Check
      if (roles) {
        const allowedList = Array.isArray(roles) ? roles : [roles];
        const satisfiesRole = allowedList.some((r) => isRoleAtLeast(userRole, r));

        if (!satisfiesRole) {
          return res.status(403).json({ error: "Forbidden: Insufficient role permissions" });
        }
      }

      // 4. Permission Check
      if (permissions) {
        const permList = Array.isArray(permissions) ? permissions : [permissions];
        const permissionsVersion = user.permissionsVersion || 1;
        const userPerms = permissionCache.getPermissions(userRole, permissionsVersion);

        const hasPerms = requireAllPermissions
          ? permList.every((p) => userPerms.has(p))
          : permList.some((p) => userPerms.has(p));

        if (!hasPerms) {
          return res.status(403).json({ error: "Forbidden: Required permission missing" });
        }
      }

      // 5. Ownership Verification Check
      if (ownership) {
        const resource = await ownership.fetchResource(req);
        const hideNotFound = ownership.hideNotFound ?? true;

        if (!resource) {
          return res.status(404).json({ error: "Resource not found" });
        }

        const userContext = {
          id: (user.id || user._id).toString(),
          role: userRole,
          isSuspended: user.isSuspended,
        };

        const isOwner = validateOwnership(userContext, ownership.resourceType, resource);

        if (!isOwner) {
          if (hideNotFound) {
            return res.status(404).json({ error: "Resource not found" });
          }
          return res.status(403).json({ error: "Forbidden: Access denied to this resource" });
        }

        (req as any).resource = resource;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
