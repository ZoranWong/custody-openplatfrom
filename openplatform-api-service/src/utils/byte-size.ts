/**
 * Byte counting helpers for API log traffic statistics.
 * Payloads are counted as JSON (UTF-8), excluding HTTP headers.
 * Top-level Buffer → raw byte length; objects are JSON-serialized,
 * so a Buffer nested inside an object counts as its JSON representation.
 */

export function byteLength(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (Buffer.isBuffer(value)) return value.length;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    // Unserializable values (circular refs, BigInt, throwing toJSON) count as zero.
    return 0;
  }
}

export function sumByteLength(...values: unknown[]): number {
  return values.reduce<number>((total, v) => total + byteLength(v), 0);
}
