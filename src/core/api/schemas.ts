import { z } from 'zod';

export const PublicationDateEnum = z.enum([
  'today',
  'this-week',
  'this-month',
  'past-2-weeks',
  'past-3-months',
  'past-6-months',
]);
export type PublicationDate = z.infer<typeof PublicationDateEnum>;

export const OrderByEnum = z.enum([
  'publicationDate',
  'tvl',
  'salary',
  'fundingDate',
  'monthlyVolume',
  'monthlyFees',
  'monthlyRevenue',
  'audits',
  'hacks',
  'chains',
  'headcountEstimate',
  'teamSize',
]);
export type OrderBy = z.infer<typeof OrderByEnum>;

export const OrderEnum = z.enum(['asc', 'desc']);
export type Order = z.infer<typeof OrderEnum>;

export const SearchJobsParamsSchema = z.object({
  query: z.string().min(1).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  order: OrderEnum.optional(),
  orderBy: OrderByEnum.optional(),
  publicationDate: PublicationDateEnum.optional(),
  seniority: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  commitments: z.array(z.string()).optional(),
  classifications: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  organizations: z.array(z.string()).optional(),
  chains: z.array(z.string()).optional(),
  ecosystems: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  fundingRounds: z.array(z.string()).optional(),
  investors: z.array(z.string()).optional(),
  minSalaryRange: z.number().nonnegative().optional(),
  maxSalaryRange: z.number().nonnegative().optional(),
  minHeadCount: z.number().nonnegative().optional(),
  maxHeadCount: z.number().nonnegative().optional(),
  minTvl: z.number().nonnegative().optional(),
  maxTvl: z.number().nonnegative().optional(),
  minMonthlyVolume: z.number().nonnegative().optional(),
  maxMonthlyVolume: z.number().nonnegative().optional(),
  minMonthlyFees: z.number().nonnegative().optional(),
  maxMonthlyFees: z.number().nonnegative().optional(),
  minMonthlyRevenue: z.number().nonnegative().optional(),
  maxMonthlyRevenue: z.number().nonnegative().optional(),
  audits: z.boolean().optional(),
  hacks: z.boolean().optional(),
  token: z.boolean().optional(),
  onboardIntoWeb3: z.boolean().optional(),
  expertJobs: z.boolean().optional(),
});
export type SearchJobsParams = z.infer<typeof SearchJobsParamsSchema>;

export const TagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    normalizedName: z.string(),
  })
  .passthrough();

export const OrganizationSchema = z
  .object({
    id: z.string(),
    orgId: z.string().optional(),
    name: z.string(),
    normalizedName: z.string(),
    location: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    discord: z.string().nullable().optional(),
    telegram: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
    docs: z.string().nullable().optional(),
    headcountEstimate: z.number().nullable().optional(),
    aggregateRating: z.number().nullable().optional(),
    reviewCount: z.number().optional(),
    fundingRounds: z.array(z.unknown()).optional(),
    investors: z.array(z.unknown()).optional(),
    projects: z.array(z.unknown()).optional(),
    grants: z.array(z.unknown()).optional(),
    reviews: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const JobListResultSchema = z
  .object({
    id: z.string(),
    shortUUID: z.string(),
    url: z.string(),
    access: z.enum(['public', 'protected']).optional(),
    title: z.string(),
    summary: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    requirements: z.array(z.string()).optional(),
    responsibilities: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    culture: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    locationType: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    commitment: z.string().nullable().optional(),
    tags: z.array(TagSchema).optional(),
    salary: z.number().nullable().optional(),
    minimumSalary: z.number().nullable().optional(),
    maximumSalary: z.number().nullable().optional(),
    salaryCurrency: z.string().nullable().optional(),
    paysInCrypto: z.boolean().nullable().optional(),
    offersTokenAllocation: z.boolean().nullable().optional(),
    onboardIntoWeb3: z.boolean().nullable().optional(),
    featured: z.boolean().nullable().optional(),
    timestamp: z.number().optional(),
    organization: OrganizationSchema,
  })
  .passthrough();

export const JobsListResponseSchema = z
  .object({
    page: z.number(),
    count: z.number(),
    total: z.number(),
    data: z.array(JobListResultSchema),
  })
  .passthrough();
export type JobsListResponse = z.infer<typeof JobsListResponseSchema>;

export const FiltersResponseSchema = z.record(z.string(), z.unknown());
export type FiltersResponse = z.infer<typeof FiltersResponseSchema>;
