// Serialize a params object into URL-encoded query string with repeated keys
// for arrays (per JOBSTASH_API.md §4.1: `tags=rust&tags=solidity`).
// Keys are sorted alphabetically so the result is deterministic for cache keying.
export function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x === undefined || x === null) continue;
        sp.append(k, String(x));
      }
    } else if (typeof v === 'boolean') {
      sp.append(k, v ? 'true' : 'false');
    } else {
      sp.append(k, String(v));
    }
  }
  sp.sort();
  return sp.toString();
}
