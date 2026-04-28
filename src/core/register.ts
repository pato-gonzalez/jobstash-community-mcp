import type { JobstashClient } from './api/client.js';
import { getJobstashClient } from './api/client.js';
import * as searchJobs from './tools/search-jobs.js';
import * as getFilterCatalog from './tools/get-filter-catalog.js';
import * as getRecentJobs from './tools/get-recent-jobs.js';
import * as getOrganization from './tools/get-organization.js';
import * as compareOrganizations from './tools/compare-organizations.js';
import * as findJobsByStack from './tools/find-jobs-by-stack.js';
import * as filtersResource from './resources/filters.js';
import * as organizationResource from './resources/organization.js';
import * as findJobPrompt from './prompts/find-my-next-crypto-job.js';
import * as evaluateOrgPrompt from './prompts/evaluate-organization.js';
import type { ToolHost } from './tools/host.js';
import type { ResourceHost } from './resources/host.js';
import type { PromptHost } from './prompts/host.js';

const TOOLS = [
  searchJobs,
  getFilterCatalog,
  getRecentJobs,
  getOrganization,
  compareOrganizations,
  findJobsByStack,
];

const RESOURCES = [filtersResource, organizationResource];
const PROMPTS = [findJobPrompt, evaluateOrgPrompt];

export interface RegistrationHost extends ToolHost, ResourceHost, PromptHost {}

export function registerTools(
  server: ToolHost,
  client: JobstashClient = getJobstashClient(),
): void {
  for (const t of TOOLS) t.register(server, client);
}

export function registerResources(
  server: ResourceHost,
  client: JobstashClient = getJobstashClient(),
): void {
  for (const r of RESOURCES) r.register(server, client);
}

export function registerPrompts(server: PromptHost): void {
  for (const p of PROMPTS) p.register(server);
}

export function registerAll(
  server: RegistrationHost,
  client: JobstashClient = getJobstashClient(),
): void {
  registerTools(server, client);
  registerResources(server, client);
  registerPrompts(server);
}
