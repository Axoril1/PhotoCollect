import { describe, it, expect, beforeEach } from "vitest";
import { Roles, isRoleAtLeast, getInheritedRoles, normalizeRole } from "../roles.js";
import { Permissions, ALL_PERMISSIONS } from "../permissions.js";
import {
  getPermissionsForRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  clearPermissionCache,
} from "../permissionMap.js";
import { validateOwnership } from "../ownership.js";
import { permissionCache } from "../permissionCache.js";
import { requireRole } from "../requireRole.js";
import { requirePermission } from "../requirePermission.js";
import { authorize } from "../authorize.js";
import { signAccessToken } from "../../../middleware/auth.js";
import jwt from "jsonwebtoken";

describe("Role-Based Access Control (RBAC) & Authorization Foundation", () => {
  beforeEach(() => {
    clearPermissionCache();
    permissionCache.invalidate();
  });

  describe("1. Roles & Hierarchy", () => {
    it("should correctly normalize role strings", () => {
      expect(normalizeRole("super_admin")).toBe(Roles.SUPER_ADMIN);
      expect(normalizeRole("ADMIN")).toBe(Roles.ADMIN);
      expect(normalizeRole("organizer")).toBe(Roles.ORGANIZER);
      expect(normalizeRole("guest")).toBe(Roles.GUEST);
      expect(normalizeRole("invalid_role")).toBe(Roles.GUEST);
    });

    it("should respect role hierarchy priority (SUPER_ADMIN > ADMIN > ORGANIZER > GUEST)", () => {
      expect(isRoleAtLeast(Roles.SUPER_ADMIN, Roles.ADMIN)).toBe(true);
      expect(isRoleAtLeast(Roles.ADMIN, Roles.ORGANIZER)).toBe(true);
      expect(isRoleAtLeast(Roles.ORGANIZER, Roles.GUEST)).toBe(true);

      // Lower roles should not satisfy higher requirements
      expect(isRoleAtLeast(Roles.GUEST, Roles.ORGANIZER)).toBe(false);
      expect(isRoleAtLeast(Roles.ORGANIZER, Roles.ADMIN)).toBe(false);
      expect(isRoleAtLeast(Roles.ADMIN, Roles.SUPER_ADMIN)).toBe(false);
    });

    it("should resolve inherited roles properly", () => {
      expect(getInheritedRoles(Roles.SUPER_ADMIN)).toEqual([
        Roles.SUPER_ADMIN,
        Roles.PLATFORM_ADMIN,
        Roles.ADMIN,
        Roles.ORGANIZER,
        Roles.GUEST,
      ]);
      expect(getInheritedRoles(Roles.ADMIN)).toEqual([Roles.ADMIN, Roles.ORGANIZER, Roles.GUEST]);
      expect(getInheritedRoles(Roles.ORGANIZER)).toEqual([Roles.ORGANIZER, Roles.GUEST]);
      expect(getInheritedRoles(Roles.GUEST)).toEqual([Roles.GUEST]);
    });
  });

  describe("2. Permission Model & Inheritance", () => {
    it("should grant GUEST only guest permissions", () => {
      const perms = getPermissionsForRole(Roles.GUEST);
      expect(perms.has(Permissions.EVENTS_READ)).toBe(true);
      expect(perms.has(Permissions.UPLOADS_CREATE)).toBe(true);
      expect(perms.has(Permissions.UPLOADS_READ)).toBe(true);

      // GUEST should NOT have organizer/admin permissions
      expect(perms.has(Permissions.EVENTS_CREATE)).toBe(false);
      expect(perms.has(Permissions.USERS_READ)).toBe(false);
      expect(perms.has(Permissions.SYSTEM_SETTINGS)).toBe(false);
    });

    it("should inherit GUEST permissions for ORGANIZER and add organizer capabilities", () => {
      const perms = getPermissionsForRole(Roles.ORGANIZER);

      // Inherited from GUEST
      expect(perms.has(Permissions.EVENTS_READ)).toBe(true);
      expect(perms.has(Permissions.UPLOADS_CREATE)).toBe(true);

      // Direct ORGANIZER
      expect(perms.has(Permissions.EVENTS_CREATE)).toBe(true);
      expect(perms.has(Permissions.EVENTS_UPDATE)).toBe(true);
      expect(perms.has(Permissions.EVENTS_DELETE)).toBe(true);
      expect(perms.has(Permissions.ANALYTICS_READ)).toBe(true);
      expect(perms.has(Permissions.BILLING_MANAGE)).toBe(true);

      // ORGANIZER should NOT have ADMIN permissions
      expect(perms.has(Permissions.USERS_READ)).toBe(false);
      expect(perms.has(Permissions.MODERATION_REVIEW)).toBe(false);
    });

    it("should inherit ORGANIZER permissions for ADMIN and add moderation/user management", () => {
      const perms = getPermissionsForRole(Roles.ADMIN);

      // Inherited from ORGANIZER
      expect(perms.has(Permissions.EVENTS_CREATE)).toBe(true);
      expect(perms.has(Permissions.ANALYTICS_READ)).toBe(true);

      // Direct ADMIN
      expect(perms.has(Permissions.USERS_READ)).toBe(true);
      expect(perms.has(Permissions.USERS_UPDATE)).toBe(true);
      expect(perms.has(Permissions.USERS_SUSPEND)).toBe(true);
      expect(perms.has(Permissions.MODERATION_REVIEW)).toBe(true);
      expect(perms.has(Permissions.AUDIT_READ)).toBe(true);

      // ADMIN should NOT have SUPER_ADMIN restricted permissions
      expect(perms.has(Permissions.USERS_DELETE)).toBe(false);
      expect(perms.has(Permissions.SYSTEM_SETTINGS)).toBe(false);
    });

    it("should grant SUPER_ADMIN full system permissions", () => {
      const perms = getPermissionsForRole(Roles.SUPER_ADMIN);
      ALL_PERMISSIONS.forEach((p) => {
        expect(perms.has(p)).toBe(true);
      });
    });

    it("should evaluate hasAllPermissions and hasAnyPermission correctly", () => {
      expect(
        hasAllPermissions(Roles.ORGANIZER, [Permissions.EVENTS_CREATE, Permissions.ANALYTICS_READ])
      ).toBe(true);
      expect(
        hasAllPermissions(Roles.ORGANIZER, [Permissions.EVENTS_CREATE, Permissions.USERS_READ])
      ).toBe(false);

      expect(
        hasAnyPermission(Roles.GUEST, [Permissions.EVENTS_READ, Permissions.USERS_READ])
      ).toBe(true);
      expect(
        hasAnyPermission(Roles.GUEST, [Permissions.USERS_READ, Permissions.SYSTEM_SETTINGS])
      ).toBe(false);
    });
  });

  describe("3. Ownership Checks & Rules", () => {
    const orgUser1 = { id: "user_org_101", role: Roles.ORGANIZER };
    const orgUser2 = { id: "user_org_102", role: Roles.ORGANIZER };
    const adminUser = { id: "user_admin_201", role: Roles.ADMIN };
    const superAdminUser = { id: "user_super_301", role: Roles.SUPER_ADMIN };
    const guestUser = { id: "user_guest_401", role: Roles.GUEST };

    const eventOwnedByOrg1 = { _id: "event_99", ownerId: "user_org_101" };

    it("should allow ORGANIZER to access their own events/analytics", () => {
      expect(validateOwnership(orgUser1, "event", eventOwnedByOrg1)).toBe(true);
      expect(validateOwnership(orgUser1, "analytics", eventOwnedByOrg1)).toBe(true);
    });

    it("should DENY ORGANIZER from accessing another organizer's events/analytics", () => {
      expect(validateOwnership(orgUser2, "event", eventOwnedByOrg1)).toBe(false);
      expect(validateOwnership(orgUser2, "analytics", eventOwnedByOrg1)).toBe(false);
    });

    it("should DENY GUEST from accessing organizer resources", () => {
      expect(validateOwnership(guestUser, "event", eventOwnedByOrg1)).toBe(false);
      expect(validateOwnership(guestUser, "analytics", eventOwnedByOrg1)).toBe(false);
    });

    it("should allow ADMIN to access events and non-super-admin users for moderation", () => {
      expect(validateOwnership(adminUser, "event", eventOwnedByOrg1)).toBe(true);
      expect(validateOwnership(adminUser, "user", { _id: "user_org_101", role: Roles.ORGANIZER })).toBe(true);
    });

    it("should DENY ADMIN from modifying SUPER_ADMIN users", () => {
      expect(validateOwnership(adminUser, "user", { _id: "user_super_301", role: Roles.SUPER_ADMIN })).toBe(false);
    });

    it("should allow SUPER_ADMIN access to any resource", () => {
      expect(validateOwnership(superAdminUser, "event", eventOwnedByOrg1)).toBe(true);
      expect(validateOwnership(superAdminUser, "user", { _id: "user_super_301", role: Roles.SUPER_ADMIN })).toBe(true);
    });
  });

  describe("4. JWT Integration & Payload Verification", () => {
    it("should embed userId, role, and permissionsVersion in JWT payload without storing raw permissions", () => {
      process.env.JWT_ACCESS_SECRET = "test_secret_key_12345";
      const user = {
        _id: "507f1f77bcf86cd799439011",
        email: "organizer@qrsnap.com",
        role: "ORGANIZER",
        permissionsVersion: 2,
      };

      const token = signAccessToken(user);
      const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      expect(decoded.sub).toBe("507f1f77bcf86cd799439011");
      expect(decoded.userId).toBe("507f1f77bcf86cd799439011");
      expect(decoded.role).toBe("ORGANIZER");
      expect(decoded.permissionsVersion).toBe(2);
      expect(decoded.permissions).toBeUndefined(); // MUST NOT store permissions inside JWT
    });
  });

  describe("5. Middleware Unit Tests", () => {
    it("requireRole should block lower roles and allow matching or higher roles", () => {
      const middleware = requireRole(Roles.ORGANIZER);

      const res: any = {
        status: function (code: number) {
          this.statusCode = code;
          return this;
        },
        json: function (data: any) {
          this.body = data;
          return this;
        },
      };

      // Guest user -> 403
      let nextCalled = false;
      middleware({ user: { role: Roles.GUEST } } as any, res, () => {
        nextCalled = true;
      });
      expect(res.statusCode).toBe(403);
      expect(nextCalled).toBe(false);

      // Organizer user -> 200 next()
      nextCalled = false;
      middleware({ user: { role: Roles.ORGANIZER } } as any, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);

      // Admin user -> 200 next() (higher role)
      nextCalled = false;
      middleware({ user: { role: Roles.ADMIN } } as any, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("requirePermission should grant access only if user role possesses permission", () => {
      const middleware = requirePermission(Permissions.EVENTS_CREATE);

      const res: any = {
        status: function (code: number) {
          this.statusCode = code;
          return this;
        },
        json: function (data: any) {
          this.body = data;
          return this;
        },
      };

      // Guest -> 403
      let nextCalled = false;
      middleware({ user: { role: Roles.GUEST } } as any, res, () => {
        nextCalled = true;
      });
      expect(res.statusCode).toBe(403);

      // Organizer -> next()
      nextCalled = false;
      middleware({ user: { role: Roles.ORGANIZER } } as any, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("authorize middleware should support full composition of auth, role, permission, and ownership", async () => {
      const middleware = authorize({
        permissions: Permissions.ANALYTICS_READ,
        ownership: {
          resourceType: "event",
          fetchResource: async (req) => {
            if (req.params.id === "event_123") {
              return { _id: "event_123", ownerId: "org_owner_1" };
            }
            return null;
          },
          hideNotFound: true,
        },
      });

      const res: any = {
        status: function (code: number) {
          this.statusCode = code;
          return this;
        },
        json: function (data: any) {
          this.body = data;
          return this;
        },
      };

      // Unauthenticated -> 401
      await middleware({ params: { id: "event_123" } } as any, res, () => {});
      expect(res.statusCode).toBe(401);

      // Authenticated Organizer attempting to access another organizer's event -> 404 (Hide not found)
      let nextCalled = false;
      await middleware(
        { user: { id: "org_owner_OTHER", role: Roles.ORGANIZER }, params: { id: "event_123" } } as any,
        res,
        () => {
          nextCalled = true;
        }
      );
      expect(res.statusCode).toBe(404);
      expect(nextCalled).toBe(false);

      // Authenticated Organizer accessing OWN event -> 200 next()
      nextCalled = false;
      const reqOrg: any = {
        user: { id: "org_owner_1", role: Roles.ORGANIZER },
        params: { id: "event_123" },
      };
      await middleware(reqOrg, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
      expect(reqOrg.resource._id).toBe("event_123");
    });
  });
});
