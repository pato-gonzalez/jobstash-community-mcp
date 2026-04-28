import { z } from 'zod';
import { toMcpError } from '../api/errors.js';
import type { JobstashClient } from '../api/client.js';
import type { JobsListResponse } from '../api/schemas.js';
import { jsonResult } from './format.js';
import type { ToolHost } from './host.js';

const inputSchema = {
  normalizedNames: z
    .array(z.string().min(1))
    .min(2)
    .max(5)
    .describe('2 to 5 organization slugs to compare side-by-side.'),
};

const description = `Compare 2-5 JobStash organizations side-by-side: headcount, total raised, last funding round,
investor count, average rating, active job count. Useful for due-diligence on potential employers.
Each org is fetched in parallel.`;

interface ComparisonRow {
  normalizedName: string;
  name: string | null;
  headcountEstimate: number | null;
  aggregateRating: number | null;
  reviewCount: number;
  totalRaised: number | null;
  lastFundingRoundName: string | null;
  fundingRoundCount: number;
  investorCount: number;
  activeJobCount: number;
  website: string | null;
  error?: string;
}

export function register(server: ToolHost, client: JobstashClient): void {
  server.tool('compare_organizations', description, inputSchema, async (args) => {
    try {
      const results = await Promise.all(
        args.normalizedNames.map(
          async (slug): Promise<{ slug: string; res?: JobsListResponse; error?: string }> => {
            try {
              const res = await client.searchJobs({ organizations: [slug], limit: 1 });
              return { slug, res };
            } catch (err) {
              return { slug, error: (err as Error).message };
            }
          },
        ),
      );

      const rows: ComparisonRow[] = results.map((r) => {
        if (r.error || !r.res) {
          return {
            normalizedName: r.slug,
            name: null,
            headcountEstimate: null,
            aggregateRating: null,
            reviewCount: 0,
            totalRaised: null,
            lastFundingRoundName: null,
            fundingRoundCount: 0,
            investorCount: 0,
            activeJobCount: 0,
            website: null,
            error: r.error ?? 'no_active_jobs',
          };
        }
        const job = r.res.data[0];
        if (!job) {
          return {
            normalizedName: r.slug,
            name: null,
            headcountEstimate: null,
            aggregateRating: null,
            reviewCount: 0,
            totalRaised: null,
            lastFundingRoundName: null,
            fundingRoundCount: 0,
            investorCount: 0,
            activeJobCount: 0,
            website: null,
            error: 'no_active_jobs',
          };
        }
        const o = job.organization;
        const rounds = (o.fundingRounds ?? []) as Array<Record<string, unknown>>;
        const totalRaised = rounds.reduce((acc, x) => {
          return acc + (typeof x.raisedAmount === 'number' ? x.raisedAmount : 0);
        }, 0);
        const sorted = [...rounds].sort(
          (a, b) => Number(b.date ?? 0) - Number(a.date ?? 0),
        );
        const last = sorted[0];
        return {
          normalizedName: o.normalizedName,
          name: o.name ?? null,
          headcountEstimate: o.headcountEstimate ?? null,
          aggregateRating: o.aggregateRating ?? null,
          reviewCount: o.reviewCount ?? 0,
          totalRaised: totalRaised > 0 ? totalRaised : null,
          lastFundingRoundName:
            last && typeof last.roundName === 'string' ? last.roundName : null,
          fundingRoundCount: rounds.length,
          investorCount: (o.investors ?? []).length,
          activeJobCount: r.res.total,
          website: o.website ?? null,
        };
      });

      return jsonResult({ comparison: rows });
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
