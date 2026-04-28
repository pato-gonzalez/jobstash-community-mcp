import { z } from 'zod';

const ConfigSchema = z.object({
  JOBSTASH_API_BASE_URL: z.string().url().default('https://middleware.jobstash.xyz'),
  JOBSTASH_API_TOKEN: z.string().optional().default(''),
  JOBSTASH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  JOBSTASH_FILTERS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  JOBSTASH_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  JOBSTASH_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  JOBSTASH_USER_AGENT: z.string().min(1).default('jobstash-mcp/0.1.0'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  MCP_BEARER_TOKEN: z.string().optional().default(''),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cached: AppConfig | undefined;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`jobstash-mcp: invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetConfigCache(): void {
  cached = undefined;
}
