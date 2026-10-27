/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Lightweight Permission Cache
 */

import { Role } from "./roles.js";
import { Permission } from "./permissions.js";
import { getPermissionsForRole } from "./permissionMap.js";

interface CacheEntry {
  permissions: Set<Permission>;
  timestamp: number;
}

class PermissionCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.ttlMs = ttlMs;
  }

  /**
   * Generates cache key from role and permissionsVersion.
   */
  private makeKey(role: Role, permissionsVersion: number = 1): string {
    return `${role}:${permissionsVersion}`;
  }

  /**
   * Gets cached permissions for a given role & version.
   */
  public get(role: Role, permissionsVersion: number = 1): Set<Permission> | null {
    const key = this.makeKey(role, permissionsVersion);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.permissions;
  }

  /**
   * Stores calculated permissions in cache.
   */
  public set(role: Role, permissionsVersion: number, permissions: Set<Permission>): void {
    const key = this.makeKey(role, permissionsVersion);
    this.cache.set(key, {
      permissions,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves effective permissions using cache fallback.
   */
  public getPermissions(role: Role, permissionsVersion: number = 1): Set<Permission> {
    const cached = this.get(role, permissionsVersion);
    if (cached) return cached;

    const computed = getPermissionsForRole(role);
    this.set(role, permissionsVersion, computed);
    return computed;
  }

  /**
   * Invalidate entry or clear cache.
   */
  public invalidate(role?: Role, permissionsVersion?: number): void {
    if (role && permissionsVersion !== undefined) {
      this.cache.delete(this.makeKey(role, permissionsVersion));
    } else {
      this.cache.clear();
    }
  }
}

export const permissionCache = new PermissionCache();
