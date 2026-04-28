import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { JobstashClient } from '../src/core/api/client.js';
import { resetConfigCache } from '../src/core/config.js';
import {
  JobstashHttpError,
  JobstashTimeoutError,
  JobstashValidationError,
} from '../src/core/api/errors.js';
import jobsFixture from './fixtures/jobs-list.json' with { type: 'json' };
import filtersFixture from './fixtures/filters.json' with { type: 'json' };

const BASE = 'https://middleware.jobstash.xyz';
const ORIGINAL_ENV = { ...process.env };

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  process.env = { ...ORIGINAL_ENV };
  resetConfigCache();
});
afterAll(() => server.close());

function makeClient(envOverrides: Record<string, string> = {}): JobstashClient {
  for (const [k, v] of Object.entries(envOverrides)) process.env[k] = v;
  resetConfigCache();
  return new JobstashClient();
}

describe('JobstashClient', () => {
  it('fetches and validates /public/jobs/list', async () => {
    server.use(http.get(`${BASE}/public/jobs/list`, () => HttpResponse.json(jobsFixture)));
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0' });
    const res = await c.searchJobs({ tags: ['solidity'] });
    expect(res.total).toBe(2);
    expect(res.data[0]?.shortUUID).toBe('AbCd12');
    expect(res.data[0]?.organization.name).toBe('Acme DeFi');
  });

  it('caches identical requests', async () => {
    const handler = vi.fn(() => HttpResponse.json(jobsFixture));
    server.use(http.get(`${BASE}/public/jobs/list`, handler));
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0' });
    await c.searchJobs({ tags: ['solidity'] });
    await c.searchJobs({ tags: ['solidity'] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cache key is order-insensitive across array params', async () => {
    const handler = vi.fn(() => HttpResponse.json(jobsFixture));
    server.use(http.get(`${BASE}/public/jobs/list`, handler));
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0' });
    await c.searchJobs({ tags: ['solidity', 'rust'] });
    await c.searchJobs({ tags: ['solidity', 'rust'] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries on 503 and eventually succeeds', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/public/jobs/list`, () => {
        calls++;
        if (calls < 2) return new HttpResponse('upstream', { status: 503 });
        return HttpResponse.json(jobsFixture);
      }),
    );
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '2' });
    const res = await c.searchJobs();
    expect(res.total).toBe(2);
    expect(calls).toBe(2);
  });

  it('does not retry on 400', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/public/jobs/list`, () => {
        calls++;
        return new HttpResponse('bad params', { status: 400 });
      }),
    );
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '3' });
    await expect(c.searchJobs()).rejects.toBeInstanceOf(JobstashHttpError);
    expect(calls).toBe(1);
  });

  it('honors Retry-After: 0 on 429', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/public/jobs/list`, () => {
        calls++;
        if (calls < 2)
          return new HttpResponse('rate limited', {
            status: 429,
            headers: { 'Retry-After': '0' },
          });
        return HttpResponse.json(jobsFixture);
      }),
    );
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '1' });
    const res = await c.searchJobs();
    expect(res.total).toBe(2);
    expect(calls).toBe(2);
  });

  it('times out long-running requests', async () => {
    server.use(
      http.get(`${BASE}/public/jobs/list`, async () => {
        await delay(500);
        return HttpResponse.json(jobsFixture);
      }),
    );
    const c = makeClient({
      JOBSTASH_MAX_RETRIES: '0',
      JOBSTASH_REQUEST_TIMEOUT_MS: '50',
    });
    await expect(c.searchJobs()).rejects.toBeInstanceOf(JobstashTimeoutError);
  });

  it('rejects on schema validation failure', async () => {
    server.use(http.get(`${BASE}/public/jobs/list`, () => HttpResponse.json({ broken: true })));
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0' });
    await expect(c.searchJobs()).rejects.toBeInstanceOf(JobstashValidationError);
  });

  it('fetches /public/jobs/filters', async () => {
    server.use(http.get(`${BASE}/public/jobs/filters`, () => HttpResponse.json(filtersFixture)));
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0' });
    const res = await c.getFilters();
    expect(Object.keys(res)).toContain('tags');
  });

  it('does not include Authorization header when no token configured', async () => {
    let observedAuth: string | null = null;
    server.use(
      http.get(`${BASE}/public/jobs/list`, ({ request }) => {
        observedAuth = request.headers.get('authorization');
        return HttpResponse.json(jobsFixture);
      }),
    );
    const c = makeClient({ JOBSTASH_MAX_RETRIES: '0', JOBSTASH_API_TOKEN: '' });
    await c.searchJobs();
    expect(observedAuth).toBeNull();
  });
});
