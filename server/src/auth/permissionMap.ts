/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Permission Mapping & Effective Resolution
 */

import { Roles, Role, normalizeRole, getInheritedRoles } from "./roles.js";
import { Permissions, Permission, ALL_PERMISSIONS } from "./permissions.js";

/**
 * Direct (declared) permissions assigned to each specific role.
 */
export const DIRECT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Roles.GUEST]: [
    Permissions.EVENTS_READ,
    Permissions.UPLOADS_CREATE,
    Permissions.UPLOADS_READ,
  ],
  [Roles.ORGANIZER]: [
    Permissions.EVENTS_CREATE,
    Permissions.EVENTS_UPDATE,
    Permissions.EVENTS_DELETE,
    Permissions.UPLOADS_DELETE,
    Permissions.ANALYTICS_READ,
    Permissions.BILLING_MANAGE,
  ],
  [Roles.ADMIN]: [
    Permissions.USERS_READ,
    Permissions.USERS_UPDATE,
    Permissions.USERS_SUSPEND,
    Permissions.MODERATION_REVIEW,
    Permissions.MODERATION_REJECT,
    Permissions.MODERATION_APPROVE,
    Permissions.AUDIT_READ,
    Permissions.ADMINS_READ,
  ],
  [Roles.PLATFORM_ADMIN]: [
    Permissions.USERS_READ,
    Permissions.USERS_UPDATE,
    Permissions.USERS_SUSPEND,
    Permissions.EVENTS_READ,
    Permissions.EVENTS_UPDATE,
    Permissions.EVENTS_DELETE,
    Permissions.UPLOADS_READ,
    Permissions.UPLOADS_DELETE,
    Permissions.MODERATION_REVIEW,
    Permissions.MODERATION_REJECT,
    Permissions.MODERATION_APPROVE,
    Permissions.ANALYTICS_READ,
    Permissions.BILLING_MANAGE,
    Permissions.SYSTEM_SETTINGS,
    Permissions.STORAGE_MANAGE,
    Permissions.AUDIT_READ,
    Permissions.ADMINS_READ,
  ],
  [Roles.MODERATOR]: [
    Permissions.MODERATION_REVIEW,
    Permissions.MODERATION_REJECT,
    Permissions.MODERATION_APPROVE,
    Permissions.UPLOADS_READ,
  ],
  [Roles.SUPPORT]: [
    Permissions.USERS_READ,
    Permissions.EVENTS_READ,
    Permissions.UPLOADS_READ,
  ],
  [Roles.READ_ONLY_ADMIN]: [
    Permissions.USERS_READ,
    Permissions.EVENTS_READ,
    Permissions.UPLOADS_READ,
    Permissions.ANALYTICS_READ,
    Permissions.AUDIT_READ,
  ],
  [Roles.SUPER_ADMIN]: [
    Permissions.USERS_DELETE,
    Permissions.SYSTEM_SETTINGS,
    Permissions.STORAGE_MANAGE,
    Permissions.ADMINS_READ,
    Permissions.ADMINS_CREATE,
    Permissions.ADMINS_UPDATE,
    Permissions.ADMINS_DELETE,
  ],
};

/**
 * Lightweight in-memory cache for resolved effective permissions by role.
 */
const effectivePermissionCache = new Map<Role, Set<Permission>>();

/**
 * Resolves all effective permissions for a role, factoring in role hierarchy inheritance.
 */
export function getPermissionsForRole(roleInput: string): Set<Permission> {
  const role = normalizeRole(roleInput);

  if (effectivePermissionCache.has(role)) {
    return effectivePermissionCache.get(role)!;
  }

  const inheritedRoles = getInheritedRoles(role);
  const permissionsSet = new Set<Permission>();

  // If SUPER_ADMIN, grant all permissions explicitly
  if (role === Roles.SUPER_ADMIN) {
    ALL_PERMISSIONS.forEach((perm) => permissionsSet.add(perm));
  } else {
    for (const r of inheritedRoles) {
      const perms = DIRECT_ROLE_PERMISSIONS[r] || [];
      perms.forEach((p) => permissionsSet.add(p));
    }
  }

  effectivePermissionCache.set(role, permissionsSet);
  return permissionsSet;
}

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(roleInput: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(roleInput);
  return permissions.has(permission);
}

/**
 * Checks if a given role has ALL of the specified permissions.
 */
export function hasAllPermissions(roleInput: string, permissions: Permission[]): boolean {
  const userPerms = getPermissionsForRole(roleInput);
  return permissions.every((p) => userPerms.has(p));
}

/**
 * Checks if a given role has AT LEAST ONE of the specified permissions.
 */
export function hasAnyPermission(roleInput: string, permissions: Permission[]): boolean {
  const userPerms = getPermissionsForRole(roleInput);
  return permissions.some((p) => userPerms.has(p));
}

/**
 * Clears the permission cache (useful during dynamic configuration updates or testing).
 */
export function clearPermissionCache(): void {
  effectivePermissionCache.clear();
}
