/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Middleware: requirePermission
 */

import { Request, Response, NextFunction } from "express";
import { Permission } from "./permissions.js";
import { normalizeRole } from "./roles.js";
import { permissionCache } from "./permissionCache.js";

export interface RequirePermissionOptions {
  requireAll?: boolean; // Default false (requires any of the listed permissions)
}

/**
 * Enforces permission requirements on routes.
 * Uses lightweight cached permission checks to eliminate per-request overhead.
 */
export function requirePermission(
  permissions: Permission | Permission[],
  options: RequirePermissionOptions = {}
) {
  const permList = Array.isArray(permissions) ? permissions : [permissions];
  const { requireAll = false } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthenticated: Authentication required" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: "Forbidden: Account is suspended" });
    }

    const userRole = normalizeRole(user.role);
    const permissionsVersion = user.permissionsVersion || 1;

    const userPermissions = permissionCache.getPermissions(userRole, permissionsVersion);

    const isAuthorized = requireAll
      ? permList.every((p) => userPermissions.has(p))
      : permList.some((p) => userPermissions.has(p));

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to perform this action",
      });
    }

    next();
  };
}
