import { LRUCache } from 'lru-cache';
import { setTimeout as sleep } from 'node:timers/promises';
import type { z } from 'zod';
import { loadConfig, type AppConfig } from '../config.js';
import { createLogger } from '../utils/logger.js';
import { buildQuery } from '../utils/query.js';
import { sanitizeHeaders } from '../utils/sanitize.js';
import {
  JobstashHttpError,
  JobstashNetworkError,
  JobstashTimeoutError,
  JobstashValidationError,
} from './errors.js';
import {
  FiltersResponseSchema,
  JobsListResponseSchema,
  type FiltersResponse,
  type JobsListResponse,
  type SearchJobsParams,
} from './schemas.js';

const log = createLogger('jobstash-client');

interface RequestOptions<S extends z.ZodTypeAny> {
  path: string;
  query?: Record<string, unknown>;
  schema: S;
  cacheTtlSeconds?: number;
  authRequired?: boolean;
}

export interface JobstashClientOptions {
  config?: AppConfig;
  fetch?: typeof globalThis.fetch;
  cache?: LRUCache<string, object>;
}

export class JobstashClient {
  private readonly config: AppConfig;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly cache: LRUCache<string, object>;

  constructor(opts: JobstashClientOptions = {}) {
    this.config = opts.config ?? loadConfig();
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.cache =
      opts.cache ??
      new LRUCache<string, object>({
        max: 500,
        ttl: this.config.JOBSTASH_CACHE_TTL_SECONDS * 1000,
      });
  }

  async searchJobs(params: SearchJobsParams = {}): Promise<JobsListResponse> {
    return this.request({
      path: '/public/jobs/list',
      query: params as Record<string, unknown>,
      schema: JobsListResponseSchema,
      cacheTtlSeconds: this.config.JOBSTASH_CACHE_TTL_SECONDS,
    });
  }

  async getFilters(): Promise<FiltersResponse> {
    return this.request({
      path: '/public/jobs/filters',
      schema: FiltersResponseSchema,
      cacheTtlSeconds: this.config.JOBSTASH_FILTERS_CACHE_TTL_SECONDS,
    });
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const base = this.config.JOBSTASH_API_BASE_URL.replace(/\/$/, '');
    const qs = query ? buildQuery(query) : '';
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }

  private async request<S extends z.ZodTypeAny>(opts: RequestOptions<S>): Promise<z.infer<S>> {
    const url = this.buildUrl(opts.path, opts.query);
    const cacheKey = `GET::${url}`;

    if (opts.cacheTtlSeconds) {
      const hit = this.cache.get(cacheKey);
      if (hit !== undefined) {
        log.debug({ url, cache: 'hit' }, 'cache hit');
        return hit as z.infer<S>;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': this.config.JOBSTASH_USER_AGENT,
    };
    if (opts.authRequired && this.config.JOBSTASH_API_TOKEN) {
      headers.Authorization = `Bearer ${this.config.JOBSTASH_API_TOKEN}`;
    }

    const data = await this.fetchWithRetry(url, headers, opts.schema);

    if (opts.cacheTtlSeconds && data && typeof data === 'object') {
      this.cache.set(cacheKey, data as object, { ttl: opts.cacheTtlSeconds * 1000 });
    }
    return data;
  }

  private async fetchWithRetry<S extends z.ZodTypeAny>(
    url: string,
    headers: Record<string, string>,
    schema: S,
  ): Promise<z.infer<S>> {
    const max = this.config.JOBSTASH_MAX_RETRIES;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= max; attempt++) {
      const start = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(),
        this.config.JOBSTASH_REQUEST_TIMEOUT_MS,
      );

      try {
        const res = await this.fetchImpl(url, {
          method: 'GET',
          headers,
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        const durationMs = Date.now() - start;
        log.info(
          {
            method: 'GET',
            url,
            status: res.status,
            durationMs,
            headers: sanitizeHeaders(headers),
          },
          'jobstash request',
        );

        if (res.ok) {
          const json = (await res.json()) as unknown;
          const parsed = schema.safeParse(json);
          if (!parsed.success) {
            log.error({ url, issues: parsed.error.issues }, 'response schema validation failed');
            throw new JobstashValidationError(url, parsed.error.message);
          }
          return parsed.data;
        }

        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          const body = await res.text().catch(() => '');
          throw new JobstashHttpError(res.status, url, body.slice(0, 500));
        }

        const retryAfter = res.headers.get('retry-after');
        const body = await res.text().catch(() => '');
        lastErr = new JobstashHttpError(res.status, url, body.slice(0, 500));
        if (attempt < max) {
          const backoffMs = computeBackoffMs(attempt, retryAfter);
          log.warn({ url, status: res.status, attempt, backoffMs }, 'retrying after server error');
          await sleep(backoffMs);
          continue;
        }
        throw lastErr;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof JobstashHttpError) {
          if (err.status < 500 && err.status !== 429) throw err;
          lastErr = err;
        } else if (err instanceof JobstashValidationError) {
          throw err;
        } else if (err instanceof Error && (err.name === 'AbortError' || isAbortError(err))) {
          lastErr = new JobstashTimeoutError(url, this.config.JOBSTASH_REQUEST_TIMEOUT_MS);
        } else {
          lastErr = new JobstashNetworkError(url, err);
        }

        if (attempt < max) {
          const backoffMs = computeBackoffMs(attempt, null);
          log.warn(
            { url, attempt, backoffMs, error: (lastErr as Error).message },
            'retrying after network/timeout error',
          );
          await sleep(backoffMs);
          continue;
        }
        throw lastErr;
      }
    }

    throw lastErr ?? new Error('jobstash request failed');
  }
}

function isAbortError(err: Error): boolean {
  // Some Node versions throw DOMException with name 'AbortError'; others throw
  // generic Error. Inspect message as a fallback.
  return /aborted|abort/i.test(err.message);
}

function computeBackoffMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);
  }
  const base = 200 * Math.pow(2, attempt);
  const jitter = Math.random() * base * 0.3;
  return Math.min(base + jitter, 10_000);
}

let singleton: JobstashClient | undefined;
export function getJobstashClient(): JobstashClient {
  if (!singleton) singleton = new JobstashClient();
  return singleton;
}
export function resetJobstashClient(): void {
  singleton = undefined;
}
