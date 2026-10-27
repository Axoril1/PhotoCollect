/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Centralized RBAC Configuration
 *
 * Designed for seamless future expansion of roles and permissions without core system redesign.
 */

import { Roles, Role } from "./roles.js";
import { Permissions, Permission } from "./permissions.js";
import { DIRECT_ROLE_PERMISSIONS } from "./permissionMap.js";

export interface RBACConfig {
  roles: typeof Roles;
  permissions: typeof Permissions;
  defaultRole: Role;
  rolePermissions: Record<Role, Permission[]>;
  hideUnauthorizedResources: boolean;
}

export const rbacConfig: RBACConfig = {
  roles: Roles,
  permissions: Permissions,
  defaultRole: Roles.ORGANIZER,
  rolePermissions: DIRECT_ROLE_PERMISSIONS,
  hideUnauthorizedResources: true,
};

/**
 * Utility to register a new dynamic permission to a role at runtime if needed.
 */
export function addPermissionToRole(role: Role, permission: Permission): void {
  if (!DIRECT_ROLE_PERMISSIONS[role].includes(permission)) {
    DIRECT_ROLE_PERMISSIONS[role].push(permission);
  }
}
