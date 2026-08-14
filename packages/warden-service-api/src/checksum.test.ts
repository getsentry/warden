import { describe, expect, it } from 'vitest';
import { canonicalJson, sha256Checksum } from './checksum.js';

describe('canonicalJson', () => {
  it('sorts object keys recursively while preserving array order', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [2, 1] }))
      .toBe('{"a":{"b":3,"y":2},"list":[2,1],"z":1}');
  });

  it('omits undefined object entries and rejects non-finite numbers', () => {
    expect(canonicalJson({ present: true, absent: undefined })).toBe('{"present":true}');
    expect(() => canonicalJson({ value: Number.NaN })).toThrow(TypeError);
  });
});

describe('sha256Checksum', () => {
  it('returns the same SHA-256 checksum for equivalent key orderings', async () => {
    const first = await sha256Checksum({ repository: 'acme/widgets', count: 2 });
    const second = await sha256Checksum({ count: 2, repository: 'acme/widgets' });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
