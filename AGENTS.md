# AGENTS.md — jobstash-mcp

Instructions for AI coding agents (Cursor, Cline, Codex, Aider, Claude Code, etc.) working **on** this codebase. If you are an agent helping a user **connect to** the deployed MCP server, read `README.md` instead — its `<!-- AI-AGENT INSTRUCTIONS -->` block is for you. If you are an MCP-aware agent or registry discovering capabilities, read `mcp.json`.

This file is the third document in that triad and the only one aimed at editing source.

---

## 1. Project Overview

- **Name:** `jobstash-mcp`. Community MCP server wrapping JobStash's public crypto/web3 jobs API.
- **License:** MIT.
- **Repository:** https://github.com/pato-gonzalez/jobstash-community-mcp
- **Live HTTP endpoint:** https://jobstash-community-mcp.vercel.app/api/mcp
- **Live manifest:** https://jobstash-community-mcp.vercel.app/mcp.json
- **Stack:** Node >= 20, TypeScript strict, Next.js 15 App Router, `mcp-handler` (Streamable HTTP transport), `@modelcontextprotocol/sdk` (stdio transport), zod 3, built-in `fetch` (undici), pino, lru-cache, vitest + msw, tsup, pnpm 10, ESLint 9 flat config.
- **Surface:** 6 tools, 2 resources, 2 prompts. V0 only consumes tools; resources and prompts ship for Claude Desktop, Cursor, Continue, Zed, Windsurf.

---

## 2. Architecture Map

Transport-agnostic core under `src/core/`, two adapters call into it: Streamable HTTP at `src/app/api/mcp/route.ts` (deployed to Vercel) and stdio at `src/bin/stdio.ts` (npm bin). Both adapters call `registerAll(server)` from `src/core/register.ts` — they never call `server.tool()` / `server.resource()` / `server.prompt()` directly.

```
src/core/                # transport-agnostic; reused by both adapters
  api/
    client.ts            # JobstashClient: fetch + retry + LRU cache + pino
    schemas.ts           # zod schemas; SOURCE OF TRUTH for input/output types
    types.ts             # hand-typed TS interfaces; documentation-only mirror of schemas
    errors.ts            # JobstashHttpError/Timeout/Network/Validation -> toMcpError
  tools/
    host.ts              # ToolHost interface; structurally compatible with McpServer
    format.ts            # toJobSummary, toOrgSummary, jsonResult helpers
    search-jobs.ts       # primary tool — most-used
    get-filter-catalog.ts
    get-recent-jobs.ts
    get-organization.ts
    compare-organizations.ts
    find-jobs-by-stack.ts
  resources/
    host.ts
    filters.ts           # jobstash://catalog/filters
    organization.ts      # jobstash://organizations/{normalizedName}
  prompts/
    host.ts
    find-my-next-crypto-job.ts
    evaluate-organization.ts
  utils/
    logger.ts            # pino factory; transport gated on NODE_ENV
    query.ts             # buildQuery: deterministic, repeated keys, sp.sort
    sanitize.ts          # sanitizeMessage / sanitizeHeaders
  config.ts              # zod-validated env, cached singleton
  register.ts            # registerAll/registerTools/registerResources/registerPrompts
src/app/
  api/mcp/route.ts       # createMcpHandler + optional withMcpAuth (bearer gate)
  layout.tsx             # minimal Next root layout
  page.tsx               # static landing page
src/bin/stdio.ts         # McpServer + StdioServerTransport; npm bin entrypoint
tests/
  client.test.ts         # 10 msw-mocked tests of JobstashClient
  fixtures/{jobs-list,filters}.json
scripts/generate-types.ts  # opt-in OpenAPI fetch with hand-typed fallback
mcp.json                                     # canonical manifest (root)
public/mcp.json                              # mirrored at build time
public/.well-known/mcp-server.json           # mirrored at build time
.github/workflows/ci.yml                     # lint+typecheck+test+build on PR/push
.github/workflows/release.yml                # npm publish on v*.*.* tag
Dockerfile + .dockerignore                   # self-host
next.config.ts           # extensionAlias .js->.ts; serverExternalPackages: pino/pino-pretty
vercel.json              # framework: nextjs
tsup.config.ts           # bundles dist/stdio.js
vitest.config.ts         # 80% line coverage threshold on src/core/
```

---

## 3. Common Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Run all tests | `pnpm test` |
| Run a single test file | `pnpm test tests/client.test.ts` |
| Build (Next + tsup) | `pnpm build` |
| Sync manifest only | `pnpm sync:manifest` |
| Dev server (HTTP) | `pnpm dev` |
| Inspect stdio bin locally | `pnpm dlx @modelcontextprotocol/inspector --cli node dist/stdio.js --method tools/list` |

All commands above are non-destructive and safe to run autonomously. Anything that mutates production (Vercel deploys, npm publish, env writes) is initiated by tags or by the user — never run those without explicit instruction.

---

## 4. Conventions

### 4.1 Source of truth

1. **`zod` is the source of truth for shapes.** `src/core/api/types.ts` is hand-typed *documentation*. If zod and `types.ts` disagree, zod wins. `src/core/tools/format.ts` infers via `z.infer<typeof JobListResultSchema>` — never imports `JobListResult` from `types.ts`.
2. **`.passthrough()` on every JobStash-derived schema is mandatory.** JobStash adds fields silently and changes enum casing without warning. Removing `.passthrough()` will crash production within days.
3. **Real upstream values are upstream-defined**, not what `JOBSTASH_API.md` hints. Examples observed in production:
   - `seniority` is `"3"`, not `"senior"`.
   - `commitment` is `"FULL_TIME"`, not `"full-time"`.
   - `locationType` is `"REMOTE"`, not `"remote"`.
   - `paysInCrypto` is sometimes `null`, not boolean — schemas use `.nullable()`.
   Tool descriptions point users at `get_filter_catalog` for canonical values; do not hardcode enums in tool input schemas beyond what the tool itself needs (e.g. `publicationDate`, `orderBy`).

### 4.2 Caching and querying

4. **Cache key is order-insensitive** — `buildQuery` calls `sp.sort()`. The test `'cache key is order-insensitive across array params'` in `tests/client.test.ts` asserts this. Do not change the sort without updating the test.

### 4.3 Logging and error sanitization (three rules)

5. **Never log full query strings at `info`.** Pino payloads at `info` may end up in shared log sinks; user search params can be sensitive. Query bodies go to `debug` only. `JobstashClient` already does this; replicate the discipline in any new code.
6. **Never include the bearer token or Authorization header in error messages.** `sanitizeMessage` strips bearer tokens from message strings; `sanitizeHeaders` redacts `authorization`, `x-api-key`, and any header name matching `/token/i`.
7. **Truncate upstream error bodies to 500 chars** (`err.message.slice(0, 500)`) — a deliberate ceiling so verbose JobStash errors cannot blow up a single log line.

### 4.4 Adapter / registration discipline

8. **Adapters share registration via `registerAll(server)`.** Adding a tool means: (a) write `src/core/tools/<kebab-name>.ts` exporting `register(server, client)`, (b) add the module to the `TOOLS` array in `src/core/register.ts`. Never call `server.tool()` directly from `src/app/api/mcp/route.ts` or `src/bin/stdio.ts`.
9. **V0 only consumes tools.** When designing a new feature, ask first whether it belongs as a tool, a resource, or a prompt. If V0 must use it, it has to be a tool. Resources and prompts ship for Claude Desktop, Cursor, Continue, Zed, Windsurf.
10. **MCP result types need `[k: string]: unknown` index signatures.** See `src/core/tools/host.ts`, `src/core/resources/host.ts`, `src/core/prompts/host.ts`. The SDK's `CallToolResult`, `ReadResourceResult`, and `GetPromptResult` types demand the index signature; without it, structural typing fails at the `server.tool/resource/prompt` call site. Do not tighten these types.

### 4.5 Build-system invariants

11. **`extensionAlias` in `next.config.ts` maps `.js` -> `.ts` for webpack.** Next.js App Router cannot resolve `.js` extensions on TypeScript source through path aliases otherwise. Keep `.js` extensions in import statements (TypeScript ESM convention) — both tsup (stdio bin) and Next.js (HTTP route) require them now.
12. **`serverExternalPackages: ['pino', 'pino-pretty']`** in `next.config.ts` keeps Pino out of the webpack bundle so it works in Vercel Functions. Do not remove or production logs break.
13. **`pnpm sync:manifest` runs before `next build`.** Editing root `mcp.json` is the canonical change; `public/mcp.json` and `public/.well-known/mcp-server.json` are derived. Do not hand-edit the public copies — your changes will be overwritten on next build.

### 4.6 Auth env vars (do not confuse)

14. **`MCP_BEARER_TOKEN`** gates **our** deployed HTTP endpoint. When set, `src/app/api/mcp/route.ts` wraps the handler with `withMcpAuth` and clients must send `Authorization: Bearer <value>`. Defaults empty (open). Pair with V0's "Bearer Token" auth option for private deployments.
15. **`JOBSTASH_API_TOKEN`** is for the **upstream** JobStash paid tier only. Token endpoints `/public/jobs` and `/public/jobs/archive` exist but are unused by current tools; the open `/public/jobs/list` covers everything.

---

## 5. Gotchas and Warnings

- **There is no per-job-by-id endpoint.** JobStash exposes only `GET /public/jobs/list` and `GET /public/jobs/filters` openly. Org data is **embedded inside each `JobListResult.organization`** — there is no `/organizations` route either. **Do not add a `get_job` tool.** Future contributors keep trying; the upstream API does not support it. Org-by-name lookups in `get-organization.ts` work by listing jobs and grouping client-side.
- **Six tools, two resources, two prompts — V0 sees only the tools.** If you ship a feature as a resource or prompt, it will be invisible to V0 users. When in doubt, ship as a tool.
- **Upstream enum values drift.** Always derive valid filter values from `get_filter_catalog` at runtime; do not bake them into zod enums.
- **`mcp-handler@1.x` declares a peer of `@modelcontextprotocol/sdk@^1.26`; we ship 1.29** with a known-OK peer warning. Do not downgrade the SDK to silence the warning.
- **`prompt-jobstash-mcp.md` is historical.** Its heuristic endpoint list is outdated. Trust `JOBSTASH_API.md` and the live `get_filter_catalog` response.
- **Coverage gate is 80% lines on `src/core/`.** A new tool without a fixture and test will fail CI even if it works locally.
- **`tsup` bundles `dist/stdio.js` as the npm bin.** Anything imported by `src/bin/stdio.ts` ends up in the published tarball; do not pull in dev-only utilities.

---

## 6. Recipes

### Add a new tool

1. Write `src/core/tools/<kebab-name>.ts` with:
   - an `inputSchema` (a flat record of zod schemas, **not** a `z.object`),
   - a multi-line `description` (LLM-facing English; this is what models see in tool listings),
   - an exported `register(server, client)` function that calls `server.tool(name, description, inputSchema, handler)`.
2. Add the module to the `TOOLS` array in `src/core/register.ts`.
3. Add a fixture under `tests/fixtures/` and a test under `tests/`.
4. Run `pnpm test && pnpm typecheck && pnpm build`.
5. Smoke locally: `pnpm dlx @modelcontextprotocol/inspector --cli node dist/stdio.js --method tools/list`.

### Add a new resource

Same shape as a tool, but `register(server, client)` calls `server.resource(name, uri | new ResourceTemplate(...), handler)`. Add the module to `RESOURCES` in `register.ts`. Note: V0 will not see it.

### Add a new prompt

`register(server)` calls `server.prompt(name, description, argsSchema, handler)`. Add to `PROMPTS` in `register.ts`. Prompt args must all be `z.string()` per MCP spec (form-style arguments).

### Bump a dependency

`pnpm install <pkg>@<version>`, then `pnpm test && pnpm typecheck && pnpm build`. Watch the SDK peer warning (see Gotchas).

### Update the manifest

Edit root `mcp.json` only. `pnpm sync:manifest` (or any `pnpm build*`) re-syncs `public/mcp.json` and `public/.well-known/mcp-server.json`.

### Verify a deploy

```bash
curl -X POST https://<host>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Should return 6 tools as an SSE stream. `curl https://<host>/mcp.json` should return the manifest with `"tools": [...]` of length 6.

### Add bearer auth to a private deploy

`vercel env add MCP_BEARER_TOKEN production`, paste a strong token, redeploy. Update V0 to use Bearer Token auth with the same value. The user runs these commands; do not run them autonomously.

---

## 7. Git and Workflow

- Default branch: `main`. PRs run `lint + typecheck + test + build` via `.github/workflows/ci.yml`.
- Releases trigger on `v*.*.*` tags via `.github/workflows/release.yml` (npm publish).
- Conventional Commits style is preferred (`feat:`, `fix:`, `chore:`, `docs:`). Recent history follows it.
- Do not push to `main` directly; open a PR.

---

## 8. Pointers (read these for deeper context)

| When you need... | Read |
| --- | --- |
| Per-client setup snippets (V0, Claude Desktop, Cursor, etc.) | `README.md` — do not duplicate here |
| Machine-readable capability list | `mcp.json` (or live `/mcp.json`) — do not duplicate here |
| Upstream JobStash API contract (filters, fields, paging) | `JOBSTASH_API.md` |
| Original Spanish-language build spec (historical) | `prompt-jobstash-mcp.md` — endpoint list is outdated |
| Streamable HTTP entrypoint | `src/app/api/mcp/route.ts` |
| stdio entrypoint | `src/bin/stdio.ts` |
| Where every tool/resource/prompt is registered | `src/core/register.ts` |
| Upstream HTTP client + retry + cache | `src/core/api/client.ts` |
| Canonical zod schemas | `src/core/api/schemas.ts` |
| Error sanitization helpers | `src/core/utils/sanitize.ts` |
| Test patterns and msw setup | `tests/client.test.ts` |

Never read `.env`, `.env.local`, or any credential file. The two relevant env vars (`MCP_BEARER_TOKEN`, `JOBSTASH_API_TOKEN`) are documented in Section 4.6; do not exfiltrate values.

---

## Annex — Skill and MCP Management

If you are running inside a harness that exposes installable skills or MCP servers (e.g. via `npx skills` or a plugin registry), you may **analyze** which ones would fit this project's needs and **suggest** them to the user.

**STRICT RULE — do not install anything without explicit prior user confirmation.** It is forbidden to run install commands for skills, MCPs, plugins, or agents — global or project-scoped — without the user saying yes first. Surface the recommendation, wait for approval, then proceed.

This rule applies regardless of how obvious the fit seems.
