import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import type { JobstashClient } from '../api/client.js';
import { jsonResult, toOrgSummary } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  normalizedName: z
    .string()
    .min(1)
    .describe(
      'Organization slug as exposed by JobStash, e.g. "uniswap", "lido", "aave". Use search_jobs first to discover slugs from JobListResult.organization.normalizedName.',
    ),
};

const description = `Fetch a JobStash organization profile (headcount, funding rounds, investors, ratings, socials)
plus its current active job count. Implementation note: JobStash has no standalone /organizations endpoint;
this tool derives the org payload from the most recent job posting that org owns.
Returns an error envelope if the slug has no active jobs.`;

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('get_organization', description, inputSchema, async (args) => {
    try {
      const res = await client.searchJobs({
        organizations: [args.normalizedName],
        limit: 1,
      });
      const job = res.data[0];
      if (!job) {
        return jsonResult({
          error: 'org_not_found_or_no_active_jobs',
          normalizedName: args.normalizedName,
          hint: 'JobStash exposes orgs only through their job postings. If this slug is correct, the org may have no active listings right now.',
        });
      }
      return jsonResult({
        ...toOrgSummary(job.organization),
        activeJobCount: res.total,
      });
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
