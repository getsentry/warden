/**
 * Check whether a target string should be treated as a filesystem path.
 */
export function isPathLike(value: string): boolean {
  return value.startsWith('.') || value.includes('/') || value.includes('\\');
}
