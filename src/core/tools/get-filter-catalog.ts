import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import type { JobstashClient } from '../api/client.js';
import type { FiltersResponse } from '../api/schemas.js';
import { jsonResult } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  query: z
    .string()
    .min(1)
    .optional()
    .describe('Optional substring to filter the returned filter keys (e.g. "tag", "chain").'),
};

const description = `Fetch the JobStash filter catalog: which filters exist, what values they accept, and which paramKey to use in search_jobs.
Returns a compact map keyed by filter name. SINGLE_SELECT/MULTI_SELECT entries expose a list of canonical values; RANGE entries expose min/max bounds.
Cached for 1 hour upstream. Call once per session before search_jobs to ground filter values in real data.`;

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('get_filter_catalog', description, inputSchema, async (args) => {
    try {
      const raw = await client.getFilters();
      const compact = compactFilters(raw, typeof args.query === 'string' ? args.query : undefined);
      return jsonResult(compact);
    } catch (e) {
      throw toMcpError(e);
    }
  });
}

interface CompactFilter {
  kind: string;
  paramKey: string;
  label: string;
  values?: string[];
  range?: { min: number; max: number; minParamKey: string; maxParamKey: string };
}

function compactFilters(raw: FiltersResponse, queryFilter?: string): Record<string, CompactFilter> {
  const out: Record<string, CompactFilter> = {};
  for (const [key, def] of Object.entries(raw)) {
    if (typeof def !== 'object' || def === null) continue;
    if (queryFilter && !key.toLowerCase().includes(queryFilter.toLowerCase())) continue;
    const d = def as Record<string, unknown>;
    if (d.kind === 'RANGE') {
      const v = d.value as { lowest?: { value?: number; paramKey?: string }; highest?: { value?: number; paramKey?: string } } | undefined;
      out[key] = {
        kind: 'RANGE',
        paramKey: key,
        label: typeof d.label === 'string' ? d.label : key,
        range: {
          min: Number(v?.lowest?.value ?? 0),
          max: Number(v?.highest?.value ?? 0),
          minParamKey: typeof v?.lowest?.paramKey === 'string' ? v.lowest.paramKey : `min${key}`,
          maxParamKey: typeof v?.highest?.paramKey === 'string' ? v.highest.paramKey : `max${key}`,
        },
      };
    } else if (d.kind === 'SINGLE_SELECT' || d.kind === 'MULTI_SELECT') {
      const opts = Array.isArray(d.options)
        ? (d.options as Array<Record<string, unknown>>)
            .map((o) => (typeof o.value === 'string' ? o.value : null))
            .filter((v): v is string => v !== null)
        : [];
      out[key] = {
        kind: String(d.kind),
        paramKey: typeof d.paramKey === 'string' ? d.paramKey : key,
        label: typeof d.label === 'string' ? d.label : key,
        values: opts,
      };
    }
  }
  return out;
}
