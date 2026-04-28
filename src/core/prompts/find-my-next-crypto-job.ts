import { z } from 'zod';
import type { PromptHost, PromptResult } from './host.js';

const argsSchema = {
  stack: z
    .string()
    .min(1)
    .describe('Comma-separated tech tags, e.g. "solidity, rust" or "react, typescript".'),
  seniority: z
    .string()
    .min(1)
    .describe('Target seniority. Free-form; e.g. "senior", "mid", "lead".'),
  locationPreference: z
    .string()
    .min(1)
    .describe('Location preference. e.g. "remote", "berlin/remote", "any".'),
  salaryFloorUsd: z
    .string()
    .optional()
    .describe('Annual USD-equivalent salary floor as a numeric string. Omit if not relevant.'),
};

const description =
  'Multi-step search wizard: find crypto/web3 jobs matching a stack, seniority, location, and optional salary floor. Outputs a system+user prompt that drives the LLM through get_filter_catalog → search_jobs → get_organization to produce a ranked shortlist.';

export function register(server: PromptHost): void {
  server.prompt('find_my_next_crypto_job', description, argsSchema, async (args): Promise<PromptResult> => {
    const text = `You are a crypto-jobs search assistant connected to the JobStash MCP server.

Mission: produce a ranked shortlist of jobs matching:
- Stack: ${args.stack}
- Seniority: ${args.seniority}
- Location preference: ${args.locationPreference}
${args.salaryFloorUsd ? `- Min annual salary (USD-equivalent): ${args.salaryFloorUsd}` : ''}

Process (do these tool calls in order):
1. get_filter_catalog — discover canonical values for tags, seniority, locations, chains. Map the user's free-form values to the catalog vocabulary before searching.
2. search_jobs — run with the mapped filters; set limit to 25 and orderBy to "publicationDate" desc unless the user prioritized salary.
3. For the top 3 results, get_organization — pull headcount, funding rounds, investors, and aggregate ratings.

Output format: numbered list. Each entry: **title** at *org* (location, locationType) — salary range — key tags. Include the apply URL and the canonical jobstash.xyz URL. End each entry with a one-line pros/cons summary derived from the org payload (funding strength, headcount, audits, ratings). If no results, suggest 2 filter relaxations.`;
    return { messages: [{ role: 'user', content: { type: 'text', text } }] };
  });
}
