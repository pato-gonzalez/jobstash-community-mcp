import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JobstashClient } from '../api/client.js';
import { toMcpError } from '../api/errors.js';
import { toOrgSummary } from '../tools/format.js';
import type { ResourceHost, ResourceResult } from './host.js';

const TEMPLATE = 'jobstash://organizations/{normalizedName}';

export function register(server: ResourceHost, client: JobstashClient): void {
  server.resource(
    'organization',
    new ResourceTemplate(TEMPLATE, { list: undefined }),
    async (uri, variables): Promise<ResourceResult> => {
      try {
        const raw = variables.normalizedName;
        const normalizedName = Array.isArray(raw) ? raw[0] : raw;
        if (!normalizedName) {
          throw new Error('missing normalizedName variable in URI template');
        }
        const res = await client.searchJobs({
          organizations: [normalizedName],
          limit: 1,
        });
        const job = res.data[0];
        const payload = job
          ? { ...toOrgSummary(job.organization), activeJobCount: res.total }
          : {
              error: 'org_not_found_or_no_active_jobs',
              normalizedName,
            };
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(payload, null, 2),
            },
          ],
        };
      } catch (e) {
        throw toMcpError(e);
      }
    },
  );
}
