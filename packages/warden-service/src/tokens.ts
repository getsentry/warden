import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { DatabaseClient, WardenDatabase } from './db/database.js';
import type { ServiceContext, ServiceRole } from './context.js';
import { hasRole } from './context.js';

const TOKEN_PREFIX = 'wds';
const PERSONAL_TOKEN_PREFIX = 'wds_pat';
const PERSONAL_TOKEN_LIFETIME_MS = 90 * 24 * 60 * 60 * 1_000;
const TOKEN_SUFFIX_LENGTH = 8;

export interface CreateServiceTokenOptions {
  tenantId: string;
  name: string;
  roles: readonly ServiceRole[];
  repositoryAllowlist?: readonly string[];
  expiresAt?: Date;
}

export interface CreatedServiceToken {
  id: string;
  token: string;
  prefix: string;
}

export interface ServiceTokenSummary {
  id: string;
  name: string;
  prefix: string;
  roles: ServiceRole[];
  repositoryAllowlist: string[] | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface PersonalTokenSummary {
  id: string;
  name: string;
  tokenSuffix: string;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedPersonalToken extends PersonalTokenSummary {
  token: string;
}

/** Hash a service credential for lookup and constant-time verification. */
export function hashServiceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Create a prefixed random credential and persist only its SHA-256 hash. */
export async function createServiceToken(database: WardenDatabase, options: CreateServiceTokenOptions): Promise<CreatedServiceToken> {
  const publicId = randomBytes(9).toString('base64url');
  const secret = randomBytes(32).toString('base64url');
  const prefix = `${TOKEN_PREFIX}_${publicId}`;
  const token = `${prefix}_${secret}`;
  const result = await database.query<{ id: string }>(`
    INSERT INTO service_tokens (
      tenant_id, name, prefix, token_hash, roles, repository_allowlist, expires_at
    ) VALUES ($1, $2, $3, $4, $5::service_role[], $6, $7)
    RETURNING id
  `, [
    options.tenantId,
    options.name,
    prefix,
    hashServiceToken(token),
    [...new Set(options.roles)],
    options.repositoryAllowlist ? [...new Set(options.repositoryAllowlist)] : null,
    options.expiresAt?.toISOString() ?? null,
  ]);
  const id = result.rows[0]?.id;
  if (!id) throw new Error('service_token_create_failed');
  return { id, token, prefix };
}

/** Create a read-only personal credential and return its plaintext value exactly once. */
export async function createPersonalToken(database: WardenDatabase, options: {
  tenantId: string;
  ownerSubject: string;
  name: string;
  now?: Date;
}): Promise<CreatedPersonalToken> {
  const now = options.now ?? new Date();
  const publicId = randomBytes(9).toString('base64url');
  const secret = randomBytes(32).toString('base64url');
  const prefix = `${PERSONAL_TOKEN_PREFIX}_${publicId}`;
  const token = `${prefix}_${secret}`;
  const tokenSuffix = token.slice(-TOKEN_SUFFIX_LENGTH);
  const expiresAt = new Date(now.getTime() + PERSONAL_TOKEN_LIFETIME_MS);
  const result = await database.query<Record<string, unknown>>(`
    INSERT INTO service_tokens (
      tenant_id, name, prefix, token_hash, credential_kind, owner_subject,
      token_suffix, roles, repository_allowlist, expires_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'personal', $5, $6, ARRAY['read']::service_role[], NULL, $7, $8, $8)
    RETURNING id, created_at
  `, [
    options.tenantId,
    options.name.trim(),
    prefix,
    hashServiceToken(token),
    options.ownerSubject,
    tokenSuffix,
    expiresAt.toISOString(),
    now.toISOString(),
  ]);
  const row = result.rows[0];
  if (!row) throw new Error('personal_token_create_failed');
  return {
    id: String(row['id']),
    name: options.name.trim(),
    token,
    tokenSuffix,
    expiresAt: expiresAt.toISOString(),
    lastUsedAt: null,
    createdAt: new Date(row['created_at'] as Date | string).toISOString(),
  };
}

interface TokenRow extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  token_hash: string;
  roles: ServiceRole[] | string;
  repository_allowlist: string[] | null;
  credential_kind?: string;
  owner_subject?: string | null;
}

function isServiceRole(value: unknown): value is ServiceRole {
  return value === 'ingest' || value === 'read' || value === 'admin';
}

function parseServiceRoles(value: unknown): ServiceRole[] {
  const roles = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.startsWith('{') && value.endsWith('}')
      ? value.slice(1, -1).split(',')
      : [];
  return roles.filter(isServiceRole);
}

async function loadToken(client: DatabaseClient, token: string): Promise<TokenRow | null> {
  if (!token.startsWith(`${TOKEN_PREFIX}_`)) return null;
  const result = await client.query<TokenRow>(`
    SELECT id, tenant_id, token_hash, roles, repository_allowlist
      , credential_kind, owner_subject
    FROM service_tokens
    WHERE token_hash = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `, [hashServiceToken(token)]);
  return result.rows[0] ?? null;
}

async function loadTokenById(client: DatabaseClient, tokenId: string): Promise<TokenRow | null> {
  const result = await client.query<TokenRow>(`
    SELECT id, tenant_id, token_hash, roles, repository_allowlist
      , credential_kind, owner_subject
    FROM service_tokens
    WHERE id = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `, [tokenId]);
  return result.rows[0] ?? null;
}

function contextFromTokenRow(row: TokenRow): ServiceContext {
  const personal = row.credential_kind === 'personal';
  return {
    tenantId: row.tenant_id,
    tokenId: row.id,
    roles: personal ? ['read'] : parseServiceRoles(row.roles),
    repositoryAllowlist: personal ? null : row.repository_allowlist,
    credentialKind: personal ? 'personal' : 'service',
    principalSubject: row.owner_subject ?? `service-token:${row.id}`,
  };
}

/** Authenticate an active token and derive immutable tenant/repository authority. */
export async function authenticateServiceToken(database: WardenDatabase, token: string): Promise<ServiceContext | null> {
  return database.transaction(async (client) => {
    const row = await loadToken(client, token);
    if (!row) return null;
    const supplied = Buffer.from(hashServiceToken(token), 'hex');
    const stored = Buffer.from(row.token_hash, 'hex');
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) return null;
    await client.query('UPDATE service_tokens SET last_used_at = now() WHERE id = $1', [row.id]);
    return contextFromTokenRow(row);
  });
}

/** Resolve a short-lived browser session back to an active token authority. */
export async function authenticateServiceTokenId(database: WardenDatabase, tokenId: string): Promise<ServiceContext | null> {
  return database.transaction(async (client) => {
    const row = await loadTokenById(client, tokenId);
    if (!row) return null;
    await client.query('UPDATE service_tokens SET last_used_at = now() WHERE id = $1', [row.id]);
    return contextFromTokenRow(row);
  });
}

/** Revoke a credential without deleting its audit record. */
export async function revokeServiceToken(database: WardenDatabase, context: ServiceContext, tokenId: string): Promise<boolean> {
  if (!hasRole(context, 'admin') || context.repositoryAllowlist !== null) return false;
  const result = await database.query(
    'UPDATE service_tokens SET revoked_at = now() WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL',
    [context.tenantId, tokenId],
  );
  return result.rowCount === 1;
}

/** List bounded credential metadata without returning hashes or secret material. */
export async function listServiceTokens(database: WardenDatabase, context: ServiceContext): Promise<ServiceTokenSummary[]> {
  if (!hasRole(context, 'admin') || context.repositoryAllowlist !== null) return [];
  const result = await database.query<Record<string, unknown>>(`
    SELECT id, name, prefix, roles, repository_allowlist, expires_at, revoked_at,
      last_used_at, created_at
    FROM service_tokens
    WHERE tenant_id = $1
    ORDER BY created_at DESC, id
    LIMIT 1000
  `, [context.tenantId]);
  return result.rows.map((row) => ({
    id: String(row['id']),
    name: String(row['name']),
    prefix: String(row['prefix']),
    roles: parseServiceRoles(row['roles']),
    repositoryAllowlist: row['repository_allowlist'] as string[] | null,
    expiresAt: row['expires_at'] ? new Date(row['expires_at'] as Date | string).toISOString() : null,
    revokedAt: row['revoked_at'] ? new Date(row['revoked_at'] as Date | string).toISOString() : null,
    lastUsedAt: row['last_used_at'] ? new Date(row['last_used_at'] as Date | string).toISOString() : null,
    createdAt: new Date(row['created_at'] as Date | string).toISOString(),
  }));
}

/** List active personal credentials owned by one authenticated browser identity. */
export async function listPersonalTokens(
  database: WardenDatabase,
  context: ServiceContext,
): Promise<PersonalTokenSummary[]> {
  if (!context.principalSubject || context.credentialKind === 'personal') return [];
  const result = await database.query<Record<string, unknown>>(`
    SELECT id, name, token_suffix, expires_at, last_used_at, created_at
    FROM service_tokens
    WHERE tenant_id = $1 AND credential_kind = 'personal' AND owner_subject = $2
      AND revoked_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC, id
    LIMIT 100
  `, [context.tenantId, context.principalSubject]);
  return result.rows.map((row) => ({
    id: String(row['id']),
    name: String(row['name']),
    tokenSuffix: String(row['token_suffix']),
    expiresAt: new Date(row['expires_at'] as Date | string).toISOString(),
    lastUsedAt: row['last_used_at'] ? new Date(row['last_used_at'] as Date | string).toISOString() : null,
    createdAt: new Date(row['created_at'] as Date | string).toISOString(),
  }));
}

/** Revoke one personal credential without exposing whether another owner has it. */
export async function revokePersonalToken(
  database: WardenDatabase,
  context: ServiceContext,
  tokenId: string,
): Promise<boolean> {
  if (!context.principalSubject || context.credentialKind === 'personal') return false;
  const result = await database.query(`
    UPDATE service_tokens SET revoked_at = now(), updated_at = now()
    WHERE id = $1 AND tenant_id = $2 AND credential_kind = 'personal'
      AND owner_subject = $3 AND revoked_at IS NULL
  `, [tokenId, context.tenantId, context.principalSubject]);
  return result.rowCount === 1;
}
