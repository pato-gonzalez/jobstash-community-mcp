// Hand-typed from JOBSTASH_API.md §5. Mirrors shape returned by
// GET /public/jobs/list at https://middleware.jobstash.xyz.
// `pnpm generate-types` will replace this file with an OpenAPI-derived
// version when /public-api-json becomes reachable.

export type JobAccess = 'public' | 'protected';
export type LocationType = 'remote' | 'hybrid' | 'onsite' | (string & {});

export interface Tag {
  id: string;
  name: string;
  normalizedName: string;
}

export interface AggregateRatings {
  benefits: number;
  careerGrowth: number;
  competency: number;
  diversityInclusion: number;
  management: number;
  onboarding: number;
  product: number;
}

export interface FundingRound {
  id?: string;
  date?: number;
  roundName?: string;
  raisedAmount?: number;
  sourceLink?: string | null;
  [key: string]: unknown;
}

export interface Investor {
  id?: string;
  name?: string;
  normalizedName?: string;
  [key: string]: unknown;
}

export interface ProjectWithRelations {
  id?: string;
  name?: string;
  normalizedName?: string;
  [key: string]: unknown;
}

export interface GrantFunding {
  id?: string;
  programName?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface OrgReview {
  id?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  orgId?: string;
  name: string;
  normalizedName: string;
  location?: string | null;
  summary?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  discord?: string | null;
  telegram?: string | null;
  github?: string | null;
  twitter?: string | null;
  docs?: string | null;
  headcountEstimate?: number | null;
  aggregateRating?: number | null;
  aggregateRatings?: AggregateRatings;
  reviewCount?: number;
  createdTimestamp?: number;
  updatedTimestamp?: number;
  projects?: ProjectWithRelations[];
  fundingRounds?: FundingRound[];
  investors?: Investor[];
  grants?: GrantFunding[];
  reviews?: OrgReview[];
  [key: string]: unknown;
}

export interface JobListResult {
  id: string;
  shortUUID: string;
  url: string;
  access?: JobAccess;
  title: string;
  summary?: string | null;
  description?: string | null;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  culture?: string | null;
  location?: string | null;
  locationType?: LocationType;
  seniority?: string | null;
  classification?: string | null;
  commitment?: string | null;
  tags?: Tag[];

  salary?: number | null;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  salaryCurrency?: string | null;
  paysInCrypto?: boolean;
  offersTokenAllocation?: boolean;

  onboardIntoWeb3?: boolean;
  ethSeasonOfInternships?: boolean;
  featured?: boolean;
  featureStartDate?: number | null;
  featureEndDate?: number | null;

  timestamp?: number;

  organization: Organization;
  [key: string]: unknown;
}

export interface JobsListResponse {
  page: number;
  count: number;
  total: number;
  data: JobListResult[];
}

export type FilterKind = 'RANGE' | 'SINGLE_SELECT' | 'MULTI_SELECT';

export interface FilterOption {
  label: string;
  value: string;
}

export interface RangeFilter {
  kind: 'RANGE';
  position: number;
  label: string;
  show: boolean;
  prefix?: string;
  value: {
    lowest: { value: number; paramKey: string };
    highest: { value: number; paramKey: string };
  };
}

export interface SelectFilter {
  kind: 'SINGLE_SELECT' | 'MULTI_SELECT';
  position: number;
  label: string;
  show: boolean;
  options: FilterOption[];
  paramKey: string;
}

export type FilterDef = RangeFilter | SelectFilter;
export type FiltersResponse = Record<string, FilterDef>;

export const CANONICAL_JOB_URL_PREFIX = 'https://jobstash.xyz/jobs/';
