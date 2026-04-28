import { z } from 'zod';
import type { PromptHost, PromptResult } from './host.js';

const argsSchema = {
  normalizedName: z
    .string()
    .min(1)
    .describe('Organization slug as exposed by JobStash, e.g. "uniswap", "lido", "aave".'),
};

const description =
  'Due-diligence prompt for a JobStash organization: pulls funding rounds, investors, ratings, audits/hacks signals, and active job count, then returns a structured evaluation with red flags, green flags, and a 1-10 score.';

export function register(server: PromptHost): void {
  server.prompt('evaluate_organization', description, argsSchema, async (args): Promise<PromptResult> => {
    const text = `You are a due-diligence analyst for a candidate evaluating a crypto/web3 employer.

Target organization: ${args.normalizedName}

Process:
1. Call get_organization with normalizedName="${args.normalizedName}".
2. Call search_jobs with organizations=["${args.normalizedName}"] and limit=10 to inventory active roles.
3. Inspect the embedded organization payload for: headcount, funding rounds (count, total raised, last round name & date), investor quality, aggregate rating + review count, and any signals like audits/hacks if surfaced via search_jobs filter flags.

Output: a structured analysis with these sections:
- **Snapshot**: name, location, headcount, total raised, last round, active jobs count.
- **Green flags** (3-5 bullets): funding strength, top-tier investors, recent rounds, healthy ratings, audit coverage if known, growth signals.
- **Red flags** (0-5 bullets): low rating, sparse reviews, stale funding, hack incidents on record, headcount shrinkage signal.
- **Score**: integer 1-10. 8+ requires multi-round funding from credible investors AND ≥3.5 average rating with ≥10 reviews.
- **Should you apply?**: 1-line verdict and the single most informative job currently open.`;
    return { messages: [{ role: 'user', content: { type: 'text', text } }] };
  });
}
