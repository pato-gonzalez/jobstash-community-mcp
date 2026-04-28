const BEARER_RE = /(Bearer\s+)([A-Za-z0-9\-_.~+/]+=*)/g;
const TOKEN_KV_RE = /(token|api[-_]?key|authorization)["':=\s]+["']?[A-Za-z0-9\-_.~+/]+=*/gi;
const SECRET_HEADER_PATTERNS = [/^authorization$/i, /^x-api-key$/i, /token/i];

export function sanitizeMessage(input: string): string {
  return input.replace(BEARER_RE, '$1***').replace(TOKEN_KV_RE, '[REDACTED]');
}

export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const isSecret = SECRET_HEADER_PATTERNS.some((p) => p.test(k));
    if (isSecret) {
      out[k] = '***';
    } else if (Array.isArray(v)) {
      out[k] = v.join(', ');
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}
