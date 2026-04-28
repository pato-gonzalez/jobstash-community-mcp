import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import {
  OrderByEnum,
  OrderEnum,
  PublicationDateEnum,
  type SearchJobsParams,
} from '../api/schemas.js';
import type { JobstashClient } from '../api/client.js';
import { jsonResult, toJobSummary } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  query: z
    .string()
    .min(1)
    .optional()
    .describe('Free-text search across title, description, and organization name.'),
  page: z.number().int().min(1).optional().describe('1-indexed page number. Defaults to 1.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (max 100). Defaults to 20.'),
  order: OrderEnum.optional(),
  orderBy: OrderByEnum.optional().describe(
    'Sort field. Useful values: "publicationDate" (newest first with order=desc), "salary", "tvl", "fundingDate", "headcountEstimate".',
  ),
  publicationDate: PublicationDateEnum.optional().describe(
    'Time-window filter. Use "today" / "this-week" / "this-month" for fresh listings.',
  ),
  seniority: z
    .array(z.string())
    .optional()
    .describe('e.g. ["junior", "mid", "senior", "lead", "principal"].'),
  locations: z
    .array(z.string())
    .optional()
    .describe('Free-form location strings, e.g. ["remote"], ["berlin"]. Use get_filter_catalog to discover canonical values.'),
  commitments: z
    .array(z.string())
    .optional()
    .describe('Employment type: ["full-time"], ["part-time"], ["contract"], ["internship"].'),
  classifications: z
    .array(z.string())
    .optional()
    .describe('Role family: ["engineering"], ["design"], ["product"], ["marketing"].'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Tech tags (normalized): ["solidity"], ["rust"], ["react", "typescript"].'),
  organizations: z.array(z.string()).optional().describe('Org normalized names.'),
  chains: z
    .array(z.string())
    .optional()
    .describe('Blockchain identifiers: ["ethereum"], ["solana"], ["polygon"].'),
  ecosystems: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  fundingRounds: z
    .array(z.string())
    .optional()
    .describe('e.g. ["seed"], ["series-a"], ["series-b"].'),
  investors: z.array(z.string()).optional(),
  minSalaryRange: z.number().nonnegative().optional().describe('Min annual USD-equivalent salary.'),
  maxSalaryRange: z.number().nonnegative().optional(),
  minHeadCount: z.number().nonnegative().optional(),
  maxHeadCount: z.number().nonnegative().optional(),
  minTvl: z.number().nonnegative().optional().describe('Min total value locked (USD).'),
  maxTvl: z.number().nonnegative().optional(),
  audits: z.boolean().optional().describe('True = only orgs with audits on record.'),
  hacks: z.boolean().optional().describe('True = only orgs with hack incidents on record.'),
  token: z.boolean().optional().describe('True = only postings that offer a token allocation.'),
  onboardIntoWeb3: z.boolean().optional().describe('True = jobs flagged as web2→web3-friendly.'),
  expertJobs: z.boolean().optional().describe('True = senior/specialist roles only.'),
};

const description = `Search active crypto / web3 / DeFi / NFT / DAO / blockchain job postings on JobStash.xyz.
Returns a paginated list of trimmed job summaries (title, organization, location, seniority, salary, tags, apply URL).
Combine multiple filters freely. Use get_filter_catalog to discover canonical filter values, or get_recent_jobs as a shortcut for time-windowed listings.`;

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('search_jobs', description, inputSchema, async (args) => {
    try {
      const params = args as SearchJobsParams;
      const limit = params.limit ?? 20;
      const page = params.page ?? 1;
      const res = await client.searchJobs(params);
      return jsonResult({
        page: res.page,
        limit,
        count: res.count,
        total: res.total,
        hasMore: page * limit < res.total,
        nextPage: page * limit < res.total ? page + 1 : null,
        jobs: res.data.map(toJobSummary),
      });
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
