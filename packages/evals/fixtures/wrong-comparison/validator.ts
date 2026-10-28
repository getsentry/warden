interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete';
  role: string;
}

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  superadmin: 3,
};

/**
 * Check if a user's role has sufficient permissions for an action.
 * Returns true if the user is allowed to perform the action.
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;

  // Bug: should be >= but uses <=, so only users with LOWER privilege
  // than required are granted access (e.g., a viewer can perform admin
  // actions, but an admin cannot).
  return userLevel <= requiredLevel;
}

/**
 * Filter a list of permissions to only those a user can perform.
 */
export function filterAllowedActions(
  userRole: string,
  permissions: Permission[]
): Permission[] {
  return permissions.filter((p) => hasPermission(userRole, p.role));
}

/**
 * Validate that a user can perform a specific action on a resource.
 */
export function validateAccess(
  userRole: string,
  resource: string,
  action: string,
  permissions: Permission[]
): boolean {
  const matching = permissions.find(
    (p) => p.resource === resource && p.action === action
  );
  if (!matching) return false;
  return hasPermission(userRole, matching.role);
}
