type Role = 'viewer' | 'editor' | 'admin' | 'owner';

interface Permission {
  action: string;
  minimumRole: Role;
}

const ROLE_LEVEL: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

/**
 * Higher roles include the permissions granted to lower roles.
 */
export function canPerform(userRole: Role, minimumRole: Role): boolean {
  const userLevel = ROLE_LEVEL[userRole];
  const requiredLevel = ROLE_LEVEL[minimumRole];
  return userLevel <= requiredLevel;
}

export function allowedActions(userRole: Role, permissions: Permission[]): string[] {
  return permissions
    .filter((permission) => canPerform(userRole, permission.minimumRole))
    .map((permission) => permission.action);
}
