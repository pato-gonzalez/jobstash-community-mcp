import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import type { JobstashClient } from '../api/client.js';
import type { SearchJobsParams } from '../api/schemas.js';
import { jsonResult, toJobSummary } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  stack: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Tech keywords. Examples: ["solidity"], ["rust", "substrate"], ["react", "typescript"]. Mapped directly to JobStash tag normalizedNames.',
    ),
  seniority: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Optional seniority filter. Values come from JobStash and are upstream-defined; call get_filter_catalog to discover them.',
    ),
  remoteOnly: z
    .boolean()
    .optional()
    .describe('If true, restrict to locations matching "remote".'),
  minSalaryUsd: z
    .number()
    .nonnegative()
    .optional()
    .describe('Minimum annual USD-equivalent salary.'),
  paysInToken: z
    .boolean()
    .optional()
    .describe('If true, only postings that offer a token allocation.'),
  limit: z.number().int().min(1).max(50).optional(),
};

const description = `Find crypto/web3 jobs matching a stack of tech keywords. Convenience wrapper over search_jobs
that maps your keywords to JobStash's tag system. Use this for quick "find me Solidity jobs" / "Rust + Substrate" intents.
For richer filters (chains, classifications, funding stage), use search_jobs directly.`;

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('find_jobs_by_stack', description, inputSchema, async (args) => {
    try {
      const params: SearchJobsParams = {
        tags: args.stack.map((s) => s.toLowerCase()),
        limit: args.limit ?? 20,
        orderBy: 'publicationDate',
        order: 'desc',
      };
      if (args.seniority && args.seniority.length > 0) params.seniority = args.seniority;
      if (args.remoteOnly) params.locations = ['remote'];
      if (typeof args.minSalaryUsd === 'number') params.minSalaryRange = args.minSalaryUsd;
      if (args.paysInToken) params.token = true;

      const res = await client.searchJobs(params);
      return jsonResult({
        stack: args.stack,
        total: res.total,
        count: res.count,
        jobs: res.data.map(toJobSummary),
      });
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
