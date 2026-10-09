/**
 * Plain-text form of a table / CSV cell. Explicit per type so objects never fall back to
 * "[object Object]" (Sonar S6551): strings and numbers as-is, dates ISO, anything else JSON.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value) ?? '';
}
