export type ServiceRole = 'ingest' | 'read' | 'admin';
export type CredentialKind = 'service' | 'personal' | 'browser';

export interface ServiceContext {
  tenantId: string;
  tokenId: string | null;
  roles: readonly ServiceRole[];
  repositoryAllowlist: readonly string[] | null;
  credentialKind?: CredentialKind;
  principalSubject?: string;
}

/** Require a runtime-authenticated tenant context at every product store boundary. */
export function requireServiceContext(context: ServiceContext | undefined): ServiceContext {
  if (!context) throw new TypeError('Authenticated service context is required');
  return context;
}

/** Check a role without accepting tenant or repository authority from request data. */
export function hasRole(context: ServiceContext, role: ServiceRole): boolean {
  return context.roles.includes('admin') || context.roles.includes(role);
}

/** Narrow authenticated repository authority using its canonical full name. */
export function canAccessRepository(context: ServiceContext, fullName: string): boolean {
  return context.repositoryAllowlist === null || context.repositoryAllowlist.includes(fullName);
}
