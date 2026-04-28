import type { z } from 'zod';
import { CANONICAL_JOB_URL_PREFIX } from '../api/types.js';
import type { JobListResultSchema, OrganizationSchema } from '../api/schemas.js';
import type { ToolResult } from './host.js';

type JobListResult = z.infer<typeof JobListResultSchema>;
type Organization = z.infer<typeof OrganizationSchema>;

export interface JobSummary {
  shortUUID: string;
  title: string;
  summary: string | null;
  organization: {
    name: string;
    normalizedName: string;
    logoUrl: string | null;
    website: string | null;
    headcountEstimate: number | null;
  };
  location: string | null;
  locationType: string | null;
  seniority: string | null;
  classification: string | null;
  commitment: string | null;
  tags: string[];
  salary: {
    min: number | null;
    max: number | null;
    exact: number | null;
    currency: string | null;
    paysInCrypto: boolean;
    offersTokenAllocation: boolean;
  };
  postedAt: number | null;
  applyUrl: string;
  canonicalUrl: string;
}

export function toJobSummary(j: JobListResult): JobSummary {
  return {
    shortUUID: j.shortUUID,
    title: j.title,
    summary: j.summary ?? null,
    organization: {
      name: j.organization.name,
      normalizedName: j.organization.normalizedName,
      logoUrl: j.organization.logoUrl ?? null,
      website: j.organization.website ?? null,
      headcountEstimate: j.organization.headcountEstimate ?? null,
    },
    location: j.location ?? null,
    locationType: j.locationType ?? null,
    seniority: j.seniority ?? null,
    classification: j.classification ?? null,
    commitment: j.commitment ?? null,
    tags: (j.tags ?? []).map((t) => t.normalizedName),
    salary: {
      min: j.minimumSalary ?? null,
      max: j.maximumSalary ?? null,
      exact: j.salary ?? null,
      currency: j.salaryCurrency ?? null,
      paysInCrypto: j.paysInCrypto === true,
      offersTokenAllocation: j.offersTokenAllocation === true,
    },
    postedAt: j.timestamp ?? null,
    applyUrl: j.url,
    canonicalUrl: `${CANONICAL_JOB_URL_PREFIX}${j.shortUUID}`,
  };
}

export interface OrgSummary {
  id: string;
  name: string;
  normalizedName: string;
  location: string | null;
  summary: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  socials: {
    discord: string | null;
    telegram: string | null;
    github: string | null;
    twitter: string | null;
    docs: string | null;
  };
  headcountEstimate: number | null;
  aggregateRating: number | null;
  reviewCount: number;
  fundingRoundCount: number;
  investorCount: number;
  projectCount: number;
  totalRaised: number | null;
  lastFundingRound: { roundName: string | null; amount: number | null; date: number | null } | null;
}

export function toOrgSummary(o: Organization): OrgSummary {
  const rounds = (o.fundingRounds ?? []) as Array<Record<string, unknown>>;
  const totalRaised = rounds.reduce((acc, r) => {
    const amt = typeof r.raisedAmount === 'number' ? r.raisedAmount : 0;
    return acc + amt;
  }, 0);
  const sorted = [...rounds].sort((a, b) => Number(b.date ?? 0) - Number(a.date ?? 0));
  const last = sorted[0];
  return {
    id: o.id,
    name: o.name,
    normalizedName: o.normalizedName,
    location: o.location ?? null,
    summary: o.summary ?? null,
    description: o.description ?? null,
    logoUrl: o.logoUrl ?? null,
    website: o.website ?? null,
    socials: {
      discord: o.discord ?? null,
      telegram: o.telegram ?? null,
      github: o.github ?? null,
      twitter: o.twitter ?? null,
      docs: o.docs ?? null,
    },
    headcountEstimate: o.headcountEstimate ?? null,
    aggregateRating: o.aggregateRating ?? null,
    reviewCount: o.reviewCount ?? 0,
    fundingRoundCount: rounds.length,
    investorCount: (o.investors ?? []).length,
    projectCount: (o.projects ?? []).length,
    totalRaised: totalRaised > 0 ? totalRaised : null,
    lastFundingRound: last
      ? {
          roundName: typeof last.roundName === 'string' ? last.roundName : null,
          amount: typeof last.raisedAmount === 'number' ? last.raisedAmount : null,
          date: typeof last.date === 'number' ? last.date : null,
        }
      : null,
  };
}

export function jsonResult(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}
