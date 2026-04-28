import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import { PublicationDateEnum } from '../api/schemas.js';
import type { JobstashClient } from '../api/client.js';
import { jsonResult, toJobSummary } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  period: PublicationDateEnum.default('this-week').describe(
    'Time window: "today" / "this-week" / "this-month" / "past-2-weeks" / "past-3-months" / "past-6-months".',
  ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('How many recent jobs to return (max 50). Defaults to 20.'),
  tags: z.array(z.string()).optional().describe('Optional tech-tag filter, e.g. ["solidity"].'),
};

const description = `Recent crypto/web3 job postings within a time window, sorted newest first.
Sugar over search_jobs with publicationDate=<period>, orderBy=publicationDate, order=desc.
Use this when the user asks "what's new this week" or wants a live digest.`;

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('get_recent_jobs', description, inputSchema, async (args) => {
    try {
      const res = await client.searchJobs({
        publicationDate: args.period,
        limit: args.limit ?? 20,
        orderBy: 'publicationDate',
        order: 'desc',
        ...(args.tags ? { tags: args.tags } : {}),
      });
      return jsonResult({
        period: args.period,
        total: res.total,
        count: res.count,
        jobs: res.data.map(toJobSummary),
      });
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
