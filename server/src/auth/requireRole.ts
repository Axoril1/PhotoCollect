/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Middleware: requireRole
 */

import { Request, Response, NextFunction } from "express";
import { Role, Roles, normalizeRole, isRoleAtLeast } from "./roles.js";

/**
 * Enforces role requirement. Supports minimum role requirement in role hierarchy or matching explicit roles.
 */
export function requireRole(...allowedRoles: (Role | string)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthenticated: Authentication required" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: "Forbidden: Account is suspended" });
    }

    const userRole = normalizeRole(user.role);

    // SUPER_ADMIN always passes role checks
    if (userRole === Roles.SUPER_ADMIN) {
      return next();
    }

    // Check if userRole satisfies any of the required roles directly or via hierarchy
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
    const hasRole = normalizedAllowed.some((reqRole) => isRoleAtLeast(userRole, reqRole));

    if (!hasRole) {
      return res.status(403).json({
        error: "Forbidden: Insufficient role permissions",
      });
    }

    next();
  };
}
