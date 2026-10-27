/**
 * QR Snap - Role-Based Access Control (RBAC)
 * Role Definitions & Hierarchy
 */

export const Roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  SUPPORT: "SUPPORT",
  READ_ONLY_ADMIN: "READ_ONLY_ADMIN",
  ORGANIZER: "ORGANIZER",
  GUEST: "GUEST",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

/**
 * Role Priority / Hierarchy Rank
 * Higher rank numerical values inherit capabilities of lower ranks.
 */
export const ROLE_HIERARCHY_RANK: Record<Role, number> = {
  [Roles.SUPER_ADMIN]: 50,
  [Roles.PLATFORM_ADMIN]: 40,
  [Roles.ADMIN]: 30,
  [Roles.MODERATOR]: 25,
  [Roles.SUPPORT]: 22,
  [Roles.READ_ONLY_ADMIN]: 21,
  [Roles.ORGANIZER]: 20,
  [Roles.GUEST]: 10,
};

/**
 * Parent-Child Role Inclusions (Direct inheritance graph)
 */
export const ROLE_INHERITANCE: Record<Role, Role[]> = {
  [Roles.SUPER_ADMIN]: [Roles.PLATFORM_ADMIN, Roles.ADMIN, Roles.ORGANIZER, Roles.GUEST],
  [Roles.PLATFORM_ADMIN]: [Roles.ADMIN, Roles.ORGANIZER, Roles.GUEST],
  [Roles.ADMIN]: [Roles.ORGANIZER, Roles.GUEST],
  [Roles.MODERATOR]: [Roles.GUEST],
  [Roles.SUPPORT]: [Roles.GUEST],
  [Roles.READ_ONLY_ADMIN]: [Roles.GUEST],
  [Roles.ORGANIZER]: [Roles.GUEST],
  [Roles.GUEST]: [],
};

/**
 * Normalizes input string to a valid Role enum value.
 */
export function normalizeRole(roleInput?: string | null): Role {
  if (!roleInput) return Roles.GUEST;
  const upper = roleInput.trim().toUpperCase();
  if (upper in Roles) {
    return upper as Role;
  }
  // Handle common aliases if any
  if (upper === "SUPERADMIN") return Roles.SUPER_ADMIN;
  return Roles.GUEST;
}

/**
 * Checks if userRole has equal or higher rank than requiredRole in the hierarchy.
 */
export function isRoleAtLeast(userRole: string, requiredRole: Role): boolean {
  const normalizedUserRole = normalizeRole(userRole);
  return ROLE_HIERARCHY_RANK[normalizedUserRole] >= ROLE_HIERARCHY_RANK[requiredRole];
}

/**
 * Retrieves all roles inherited by a given role (including itself).
 */
export function getInheritedRoles(role: string): Role[] {
  const normalizedRole = normalizeRole(role);
  return [normalizedRole, ...(ROLE_INHERITANCE[normalizedRole] || [])];
}
