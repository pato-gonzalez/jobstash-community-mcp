# JobStash Public API — Integration Guide for AI Code Generators

> Drop this file into Vercel V0 (or any AI codegen tool) as the single source of truth for building a UI/agent against the JobStash crypto-jobs API.

---

## 1. What JobStash Is

JobStash (https://jobstash.xyz) is a job board focused on **crypto, web3, DeFi, NFTs, DAOs, and blockchain** roles. It exposes a public REST API powered by a NestJS + Neo4j middleware. Source: https://github.com/jobstash/middleware (GPL-3.0).

**Use this API when:** building a job-search UI, a Telegram/Discord bot, a digest emailer, an alert system, or a personalized matching agent for web3 jobs.

**Do not use it for:** non-crypto jobs (none indexed), bulk scraping (be polite — cache aggressively).

---

## 2. Base URL & Discovery

| Resource | URL |
|---|---|
| API base | `https://middleware.jobstash.xyz` |
| Swagger UI | `https://middleware.jobstash.xyz/public-api` |
| OpenAPI JSON | `https://middleware.jobstash.xyz/public-api-json` |
| Frontend (canonical job links) | `https://jobstash.xyz` / `https://app.jobstash.xyz/jobs` |

All public endpoints live under `/public/*`. CORS appears permissive (browser-callable).

---

## 3. Auth

| Endpoint | Auth |
|---|---|
| `GET /public/jobs/list` | **None — fully open** |
| `GET /public/jobs/filters` | **None — fully open** |
| `GET /public/jobs` | Bearer token (paid/partner tier) |
| `GET /public/jobs/archive` | Bearer token (paid/partner tier) |

**Recommendation:** for V0 prototypes use `/public/jobs/list` — same filters, same response shape, no key needed.

If a bearer token is required later: `Authorization: Bearer <token>`. Tokens are obtained out-of-band (contact JobStash).

**No documented rate limits.** Treat as best-effort: cache responses, debounce client searches, exponential backoff on 429/5xx.

---

## 4. Endpoints

### 4.1 `GET /public/jobs/list` — search jobs (open)

Returns a paginated list of currently active job posts.

**Response shape:**

```ts
{
  page: number,        // current page (1-indexed)
  count: number,       // items in this page
  total: number,       // total matches across all pages
  data: JobListResult[] // see §5
}
```

**Query parameters** (all optional, all combinable):

| Param | Type | Notes |
|---|---|---|
| `query` | string | Free-text search across title / description / org |
| `page` | number | Default `1` |
| `limit` | number | Default `20`. Keep ≤ 100 |
| `order` | `asc` \| `desc` | |
| `orderBy` | enum | `publicationDate` \| `tvl` \| `salary` \| `fundingDate` \| `monthlyVolume` \| `monthlyFees` \| `monthlyRevenue` \| `audits` \| `hacks` \| `chains` \| `headcountEstimate` \| `teamSize` |
| `publicationDate` | enum | `today` \| `this-week` \| `this-month` \| `past-2-weeks` \| `past-3-months` \| `past-6-months` |
| `seniority` | string[] | e.g. `junior`, `mid`, `senior`, `lead` |
| `locations` | string[] | Free-form location strings (use `/filters` for canonical list) |
| `commitments` | string[] | e.g. `full-time`, `part-time`, `contract`, `internship` |
| `classifications` | string[] | e.g. `engineering`, `design`, `product`, `marketing` |
| `tags` | string[] | Tech tags: `rust`, `solidity`, `react`, `typescript`, … |
| `organizations` | string[] | Org normalized names |
| `chains` | string[] | `ethereum`, `solana`, `polygon`, `bitcoin`, … |
| `ecosystems` | string[] | Ecosystem identifiers |
| `projects` | string[] | Project normalized names |
| `fundingRounds` | string[] | `seed`, `series-a`, `series-b`, … |
| `investors` | string[] | Investor normalized names |
| `minSalaryRange` / `maxSalaryRange` | number | USD-equivalent annual |
| `minHeadCount` / `maxHeadCount` | number | Org headcount |
| `minTvl` / `maxTvl` | number | Total Value Locked (USD) |
| `minMonthlyVolume` / `maxMonthlyVolume` | number | |
| `minMonthlyFees` / `maxMonthlyFees` | number | |
| `minMonthlyRevenue` / `maxMonthlyRevenue` | number | |
| `audits` | boolean | Org has been audited |
| `hacks` | boolean | Org has had a hack incident |
| `token` | boolean | Job offers token allocation |
| `onboardIntoWeb3` | boolean | Suitable for web2→web3 transition |
| `expertJobs` | boolean | Senior/specialist roles only |

**Array params**: pass repeated keys (`tags=rust&tags=solidity`) or comma-separated — both work in Nest's default parser; repeated keys are safer.

**Examples:**

```bash
# Senior Rust roles posted this week, paid in token
curl "https://middleware.jobstash.xyz/public/jobs/list?query=rust&seniority=senior&publicationDate=this-week&token=true&limit=20"

# Remote Solidity engineering jobs, sorted by salary desc
curl "https://middleware.jobstash.xyz/public/jobs/list?tags=solidity&classifications=engineering&locations=remote&orderBy=salary&order=desc"

# Jobs at audited orgs with TVL > $100M
curl "https://middleware.jobstash.xyz/public/jobs/list?audits=true&minTvl=100000000"
```

### 4.2 `GET /public/jobs/filters` — discover valid filter values (open)

Returns the full filter catalog with allowed values, ranges, and labels. **Call this on app load** to populate dropdowns/chips dynamically rather than hardcoding values.

**Response shape (top-level keys):**

```
publicationDate, salary, seniority, locations, headcountEstimate,
tvl, monthlyFees, monthlyVolume, monthlyRevenue, audits, hacks,
fundingRounds, investors, tags, onboardIntoWeb3, expertJobs,
order, orderBy, commitments, classifications, chains, projects,
ecosystems, organizations
```

Each entry is one of three filter types:

```ts
type RangeFilter = {
  position: number, label: string, show: boolean,
  value: { lowest: { value: number, paramKey: string },
           highest: { value: number, paramKey: string } },
  prefix?: string, kind: "RANGE"
}

type SingleSelectFilter = {
  position: number, label: string, show: boolean,
  options: { label: string, value: string }[],
  paramKey: string, kind: "SINGLE_SELECT"
}

type MultiSelectFilter = {
  position: number, label: string, show: boolean,
  options: { label: string, value: string }[],
  paramKey: string, kind: "MULTI_SELECT"
}
```

### 4.3 `GET /public/jobs` & `GET /public/jobs/archive` — bearer-only

Same query params and response shape as `/public/jobs/list`. `/archive` returns expired/closed posts. Skip unless you have a token.

---

## 5. `JobListResult` — single job object

Live-verified field set (returned today by `/public/jobs/list`):

```ts
type JobListResult = {
  id: string,                    // internal uuid
  shortUUID: string,             // e.g. "CLHgEq" — use for canonical URL
  url: string,                   // external apply URL (employer's ATS / careers page)
  access: "public" | "protected",
  title: string,
  summary: string,
  description: string,
  requirements: string[],
  responsibilities: string[],
  benefits: string[],
  culture: string | null,
  location: string,
  locationType: "remote" | "hybrid" | "onsite" | string,
  seniority: string,             // "junior" | "mid" | "senior" | "lead" | "principal"
  classification: string,        // "engineering" | "design" | "product" | …
  commitment: string,            // "full-time" | "contract" | …
  tags: { id: string, name: string, normalizedName: string }[],

  // compensation
  salary: number | null,
  minimumSalary: number | null,
  maximumSalary: number | null,
  salaryCurrency: string | null, // "USD", "USDC", "ETH", …
  paysInCrypto: boolean,
  offersTokenAllocation: boolean,

  // flags
  onboardIntoWeb3: boolean,
  ethSeasonOfInternships: boolean,
  featured: boolean,
  featureStartDate: number | null,
  featureEndDate: number | null,

  timestamp: number,             // unix seconds — publication date

  organization: {
    id: string,
    orgId: string,
    name: string,
    normalizedName: string,      // use in URL
    location: string,
    summary: string,
    description: string,
    logoUrl: string,
    website: string,
    discord: string | null,
    telegram: string | null,
    github: string | null,
    twitter: string | null,
    docs: string | null,
    headcountEstimate: number,
    aggregateRating: number,     // 0–5
    aggregateRatings: {
      benefits: number, careerGrowth: number, competency: number,
      diversityInclusion: number, management: number,
      onboarding: number, product: number
    },
    reviewCount: number,
    createdTimestamp: number,
    updatedTimestamp: number,
    projects: ProjectWithRelations[],
    fundingRounds: FundingRound[],
    investors: Investor[],
    grants: GrantFunding[],
    reviews: OrgReview[]
  }
}
```

**Canonical job URL** for linking back to JobStash:
```
https://jobstash.xyz/jobs/{shortUUID}
```
The job's own apply page is `JobListResult.url` — open this for the actual application.

---

## 6. Frontend Integration Patterns

### 6.1 Minimal fetch (TypeScript / V0-friendly)

```ts
const BASE = "https://middleware.jobstash.xyz";

export type JobsParams = {
  query?: string;
  page?: number;
  limit?: number;
  tags?: string[];
  seniority?: string[];
  classifications?: string[];
  commitments?: string[];
  locations?: string[];
  publicationDate?: "today" | "this-week" | "this-month"
                  | "past-2-weeks" | "past-3-months" | "past-6-months";
  orderBy?: "publicationDate" | "salary" | "tvl" | "fundingDate";
  order?: "asc" | "desc";
  minSalaryRange?: number;
  maxSalaryRange?: number;
  token?: boolean;
  onboardIntoWeb3?: boolean;
};

function buildQuery(p: JobsParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  }
  return sp.toString();
}

export async function searchJobs(params: JobsParams = {}) {
  const qs = buildQuery({ limit: 20, page: 1, ...params });
  const res = await fetch(`${BASE}/public/jobs/list?${qs}`, {
    next: { revalidate: 300 }, // Next.js — cache 5 min
  });
  if (!res.ok) throw new Error(`JobStash ${res.status}`);
  return res.json() as Promise<{
    page: number; count: number; total: number; data: JobListResult[];
  }>;
}

export async function getFilterConfigs() {
  const res = await fetch(`${BASE}/public/jobs/filters`, {
    next: { revalidate: 3600 }, // cache 1 h
  });
  return res.json();
}
```

### 6.2 React Query / SWR keys

Cache key = full param object. Stale time ≥ 5 min (jobs don't change often).

### 6.3 Pagination

`/public/jobs/list` returns `total`. Pages are 1-indexed. UX: infinite scroll appending pages, or numbered pagination using `Math.ceil(total / limit)`.

### 6.4 Empty state / errors

- 200 with `data: []` → no matches; show empty state with "Clear filters" CTA.
- 4xx/5xx → render "JobStash unavailable, retry" + log; **do not retry tightly** (no documented limits).

---

## 7. Recommended UI Modules (for V0 to scaffold)

1. **Search bar** — bound to `query`, debounced 300 ms.
2. **Filter sidebar** — populated from `/public/jobs/filters`. Group: Date, Compensation (range sliders), Seniority, Classification, Tags, Location, Chains, Org filters (audits/hacks/headcount/TVL).
3. **Job card** — title · org name+logo · location · seniority · salary range · tags (top 5) · "Apply" → external `url`, "Details" → `https://jobstash.xyz/jobs/{shortUUID}`.
4. **Job detail drawer/page** — full description, requirements, responsibilities, benefits, org summary, projects, funding, ratings.
5. **Saved searches / alerts** — persist `JobsParams` per user; poll `/public/jobs/list` and diff by `id` to surface new matches.
6. **Org page** — group jobs by `organization.normalizedName`.

---

## 8. AI Agent Patterns

### 8.1 Natural-language → filter mapping

Have the LLM translate user prose into a `JobsParams` object. Provide it the enum sets from §4.1 and dynamic vocab from `/public/jobs/filters` (call once, cache, inject into the system prompt). Always validate the LLM's JSON against `JobsParams` before fetching.

### 8.2 Job ranking / matching

Fetch a candidate set (e.g. `limit=100`), then re-rank locally against a user profile (resume embeddings, preferred chains, salary floor) before showing top N. The API does no personalized scoring.

### 8.3 Digest / alerts

Cron a job every N hours. Persist last-seen `id` set per saved search. Diff to find new postings → push to Telegram / email.

---

## 9. Quick Smoke Test

```bash
curl -s "https://middleware.jobstash.xyz/public/jobs/list?limit=1" | jq '.data[0] | {title, org: .organization.name, url, shortUUID}'
```

Expected: a single object with `title`, `org`, `url`, `shortUUID`.

---

## 10. Constraints & Caveats (must be respected by codegen)

- **Crypto/web3 only.** Don't promise general-purpose job search.
- **Synchronous, REST-only.** No webhooks, no GraphQL, no streaming.
- **No write endpoints in the public surface.** Posting jobs goes through a Typeform on jobstash.xyz — not the API.
- **Salaries are advisory.** Many postings have null/zero salary fields; surface "Not disclosed" gracefully.
- **External apply URLs.** Always open `JobListResult.url` in a new tab; never embed third-party ATS pages.
- **Cache aggressively.** No published rate limit ≠ infinite quota. 5-min server cache + browser SWR is a good baseline.
- **No PII collection by JobStash on behalf of users.** Applications happen on the employer's site.
