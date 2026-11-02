import { describe, it, expect } from 'vitest';
import { byteLength, sumByteLength } from '../../src/utils/byte-size';

describe('byte-size', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('中文')).toBe(6);
  });

  it('serializes objects before counting', () => {
    expect(byteLength({ a: 1 })).toBe(7); // {"a":1}
    expect(byteLength({ 名称: '充值' })).toBeGreaterThan(6);
  });

  it('returns 0 for null / undefined', () => {
    expect(byteLength(null)).toBe(0);
    expect(byteLength(undefined)).toBe(0);
  });

  it('returns the string byte length as-is for strings', () => {
    expect(byteLength('{"a":1}')).toBe(7);
  });

  it('sums multiple values and tolerates unserializable ones', () => {
    const circular: any = {};
    circular.self = circular;
    expect(sumByteLength({ a: 1 }, 'xy', circular)).toBe(7 + 2 + 0);
  });
});
