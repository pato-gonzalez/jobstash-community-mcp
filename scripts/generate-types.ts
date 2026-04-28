#!/usr/bin/env tsx
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.JOBSTASH_API_BASE_URL ?? 'https://middleware.jobstash.xyz';
const SPEC_URLS = [`${BASE}/public-api-json`, `${BASE}/api-json`];

async function fetchSpec(): Promise<Record<string, unknown> | null> {
  for (const url of SPEC_URLS) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        console.warn(`[generate-types] ${url} -> ${res.status}`);
        continue;
      }
      const json = (await res.json()) as Record<string, unknown>;
      if (json && typeof json === 'object' && 'paths' in json) {
        console.warn(`[generate-types] fetched OpenAPI from ${url}`);
        return json;
      }
    } catch (e) {
      console.warn(`[generate-types] fetch failed for ${url}:`, (e as Error).message);
    }
  }
  return null;
}

async function main(): Promise<void> {
  const spec = await fetchSpec();
  if (!spec) {
    console.warn(
      '[generate-types] no OpenAPI spec reachable; keeping hand-typed src/core/api/types.ts',
    );
    return;
  }

  const specPath = resolve(process.cwd(), 'openapi.json');
  await writeFile(specPath, JSON.stringify(spec, null, 2), 'utf8');

  const mod = (await import('openapi-typescript')) as unknown as {
    default: (input: URL | string) => Promise<unknown>;
    astToString: (ast: unknown) => string;
  };
  const ast = await mod.default(new URL(`file://${specPath}`));
  const tsCode = mod.astToString(ast);

  const outPath = resolve(process.cwd(), 'src/core/api/openapi-types.ts');
  await writeFile(
    outPath,
    `// Auto-generated from JobStash OpenAPI. Do not edit by hand.\n// Regenerate with \`pnpm generate-types\`.\n${tsCode}`,
    'utf8',
  );
  console.warn(`[generate-types] wrote ${outPath}`);
}

main().catch((e: unknown) => {
  console.error('[generate-types] failed:', e);
  process.exit(1);
});
