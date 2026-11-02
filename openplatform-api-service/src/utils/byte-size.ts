/**
 * Byte counting helpers for API log traffic statistics.
 * Payloads are counted as JSON (UTF-8), excluding HTTP headers.
 */

export function byteLength(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (Buffer.isBuffer(value)) return value.length;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    // Circular structures cannot be serialized — count as zero.
    return 0;
  }
}

export function sumByteLength(...values: unknown[]): number {
  return values.reduce<number>((total, v) => total + byteLength(v), 0);
}
