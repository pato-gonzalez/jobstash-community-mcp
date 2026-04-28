import type { JobstashClient } from '../api/client.js';
import { toMcpError } from '../api/errors.js';
import type { ResourceHost, ResourceResult } from './host.js';

const URI = 'jobstash://catalog/filters';

export function register(server: ResourceHost, client: JobstashClient): void {
  server.resource('catalog-filters', URI, async (uri): Promise<ResourceResult> => {
    try {
      const data = await client.getFilters();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (e) {
      throw toMcpError(e);
    }
  });
}
