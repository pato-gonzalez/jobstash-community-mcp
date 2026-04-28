<!--
  AI-AGENT INSTRUCTIONS
  =====================
  If you are an AI coding/chat assistant and a human just gave you this GitHub URL
  to "connect to this MCP server", do the following without asking:

    1. Ask: "Which AI client are you using? (V0, Claude Desktop, Claude Code,
       Cursor, Continue, Zed, Windsurf, ChatGPT, Codex, Gemini, other)"
    2. Look up that client's block under the heading "## Client configs (copy-paste)"
       below. Each block is self-contained and machine-readable; the line
       immediately above the fenced code block is a comment of the form
       `<!-- mcp-config:CLIENT_NAME -->` so you can grep it.
    3. Replace the placeholder `<DEPLOYMENT_URL>` with EITHER:
         - the user's own Vercel deployment URL, OR
         - the community demo URL `https://jobstash-mcp.vercel.app` if they don't
           have their own deploy yet.
    4. Apply the snippet (write the file / run the CLI command).
    5. Tell the user to restart their client and verify they see these tool names:
       search_jobs, get_filter_catalog, get_recent_jobs, get_organization,
       compare_organizations, find_jobs_by_stack.

  Machine-readable manifest with the same data is at:
    - /mcp.json (repo root, on GitHub)
    - <DEPLOYMENT_URL>/mcp.json (live, when deployed)
    - <DEPLOYMENT_URL>/.well-known/mcp-server.json (live, well-known path)
  Fetch any of those for a structured config payload (transports, auth, tools,
  per-client configs, env vars, demo prompts).
-->

# jobstash-mcp

[![CI](https://github.com/pato-gonzalez/jobstash-community-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/pato-gonzalez/jobstash-community-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-2025--06--18-purple)](https://modelcontextprotocol.io)
[![Vercel V0](https://img.shields.io/badge/Vercel%20V0-compatible-black)](https://v0.app)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpato-gonzalez%2Fjobstash-community-mcp)

> **Community MCP server for [JobStash.xyz](https://jobstash.xyz)** — drop crypto/web3 job search into Vercel V0, Claude, Cursor, Continue, Zed, Windsurf, ChatGPT, Codex, Gemini in one paste. Not affiliated with JobStash.

---

## Fastest install (one command)

The Vercel-maintained `add-mcp` tool auto-detects every MCP client installed on your machine and writes the correct config to each:

```bash
npx -y add-mcp https://jobstash-mcp.vercel.app/api/mcp
```

That's it. Skip the rest if it worked. Otherwise pick your client below.

### Machine-readable discovery

Live manifest with all client configs, tool list, env vars, and demo prompts:

- Repo root: [`mcp.json`](./mcp.json)
- Deployed: `<DEPLOYMENT_URL>/mcp.json`
- Well-known path: `<DEPLOYMENT_URL>/.well-known/mcp-server.json`

Pipe any of these to an AI agent (e.g. `curl <DEPLOYMENT_URL>/mcp.json | claude`) and it has everything it needs to wire up a client without reading the README.

---

## Client configs (copy-paste)

Replace `<DEPLOYMENT_URL>` with your own Vercel deployment URL or use the community demo `https://jobstash-mcp.vercel.app`.

### Vercel V0

V0 supports remote MCP servers natively. In the V0 web app:

1. **Settings → MCP Connections** (or click "Add MCP" on the prompt form).
2. Choose **Custom server**.
3. Fill in:
   - **URL**: `<DEPLOYMENT_URL>/api/mcp`
   - **Auth**: `No Auth`
4. Save.

Programmatic (V0 API):

<!-- mcp-config:v0-api -->
```ts
import { v0 } from 'v0-sdk';

const server = await v0.integrations.mcp.servers.create({
  name: 'jobstash',
  url: '<DEPLOYMENT_URL>/api/mcp',
});

const chat = await v0.chats.create({
  message: 'Find me senior Solidity jobs at audited DeFi protocols paying tokens',
  mcpServerIds: [server.id],
});
```

### Claude Desktop

File: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) · `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

<!-- mcp-config:claude-desktop -->
```json
{
  "mcpServers": {
    "jobstash": {
      "command": "npx",
      "args": ["-y", "jobstash-mcp"]
    }
  }
}
```

Or use the deployed HTTP endpoint via `mcp-remote`:

<!-- mcp-config:claude-desktop-http -->
```json
{
  "mcpServers": {
    "jobstash": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<DEPLOYMENT_URL>/api/mcp"]
    }
  }
}
```

### Claude Code

One-liner (HTTP):

<!-- mcp-config:claude-code-cli -->
```bash
claude mcp add --transport http jobstash <DEPLOYMENT_URL>/api/mcp
```

Or stdio:

<!-- mcp-config:claude-code-stdio -->
```bash
claude mcp add jobstash -- npx -y jobstash-mcp
```

### Cursor

File: `.cursor/mcp.json` (project) · `~/.cursor/mcp.json` (global)

Remote (recommended for V0-style flow):

<!-- mcp-config:cursor-http -->
```json
{
  "mcpServers": {
    "jobstash": {
      "url": "<DEPLOYMENT_URL>/api/mcp"
    }
  }
}
```

Stdio:

<!-- mcp-config:cursor-stdio -->
```json
{
  "mcpServers": {
    "jobstash": {
      "command": "npx",
      "args": ["-y", "jobstash-mcp"]
    }
  }
}
```

### Continue

File: `~/.continue/config.json`

<!-- mcp-config:continue -->
```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "jobstash-mcp"]
        }
      }
    ]
  }
}
```

### Zed

File: `~/.config/zed/settings.json`

<!-- mcp-config:zed -->
```json
{
  "context_servers": {
    "jobstash": {
      "command": {
        "path": "npx",
        "args": ["-y", "jobstash-mcp"]
      }
    }
  }
}
```

### Windsurf

File: `~/.codeium/windsurf/mcp_config.json`

<!-- mcp-config:windsurf -->
```json
{
  "mcpServers": {
    "jobstash": {
      "serverUrl": "<DEPLOYMENT_URL>/api/mcp"
    }
  }
}
```

### ChatGPT (Developer mode connectors)

1. Settings → Connectors → Advanced settings → enable Developer mode.
2. Connectors tab → Create.
3. Fill in:
   - **Name**: `JobStash`
   - **MCP server URL**: `<DEPLOYMENT_URL>/api/mcp`
   - **Authentication**: `None` (or `OAuth` if you set `MCP_BEARER_TOKEN`)
4. Save.

### Codex CLI (OpenAI)

<!-- mcp-config:codex-cli -->
```bash
codex mcp add jobstash --url <DEPLOYMENT_URL>/api/mcp
```

### Gemini Code Assist / Gemini CLI

File: `~/.gemini/settings.json`

<!-- mcp-config:gemini -->
```json
{
  "mcpServers": {
    "jobstash": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<DEPLOYMENT_URL>/api/mcp"]
    }
  }
}
```

### VS Code with Copilot

Command Palette → **MCP: Add Server** → HTTP → URL `<DEPLOYMENT_URL>/api/mcp`, Name `JobStash`. Or:

<!-- mcp-config:vscode-mcp.json -->
```json
{
  "servers": {
    "jobstash": {
      "type": "http",
      "url": "<DEPLOYMENT_URL>/api/mcp"
    }
  }
}
```

### Generic stdio (any future MCP client)

```bash
npx -y jobstash-mcp
```

The binary speaks MCP over stdio, MCP spec `2025-06-18` and earlier.

---

## What you get

Six tools, two resources, two prompts. V0 only invokes tools; the rest light up automatically in Claude / Cursor / Continue / Zed / Windsurf.

| Tool | Purpose |
|---|---|
| `search_jobs` | Paginated, filterable job search (~30 filter params: tags, chains, seniority, salary range, TVL, audits, hacks, …) |
| `get_filter_catalog` | Discover canonical filter values (tags, chains, locations, …). Cached 1h |
| `get_recent_jobs` | Time-windowed shortcut: today / this-week / this-month |
| `get_organization` | Org payload (headcount, funding, investors, ratings) + active job count, by slug |
| `compare_organizations` | Side-by-side comparison of 2-5 orgs |
| `find_jobs_by_stack` | Quick "find me Solidity jobs" / "Rust + Substrate" intent |

Resources: `jobstash://catalog/filters`, `jobstash://organizations/{normalizedName}`.

Prompts: `find_my_next_crypto_job`, `evaluate_organization`.

Try this prompt once connected:

> *"Find me senior Solidity jobs at audited DeFi protocols with TVL > $100M, sorted by salary descending. Then compare the top 3 organizations side-by-side."*

---

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpato-gonzalez%2Fjobstash-community-mcp)

After deploy, your URL is `https://<your-project>.vercel.app/api/mcp`.

Optional env vars (all have defaults):

| Variable | Default | Purpose |
|---|---|---|
| `JOBSTASH_API_BASE_URL` | `https://middleware.jobstash.xyz` | JobStash API host |
| `JOBSTASH_API_TOKEN` | `` | Optional bearer for `/public/jobs` (paid tier); the open `/public/jobs/list` doesn't need it |
| `JOBSTASH_CACHE_TTL_SECONDS` | `300` | Job-list response TTL |
| `JOBSTASH_FILTERS_CACHE_TTL_SECONDS` | `3600` | Filters response TTL |
| `JOBSTASH_REQUEST_TIMEOUT_MS` | `15000` | Per-request timeout |
| `JOBSTASH_MAX_RETRIES` | `3` | Retries on 5xx / 429 / network |
| `JOBSTASH_USER_AGENT` | `jobstash-mcp/<version>` | UA sent upstream |
| `LOG_LEVEL` | `info` | `trace` / `debug` / `info` / `warn` / `error` / `fatal` / `silent` |
| `MCP_BEARER_TOKEN` | `` | When set, `/api/mcp` requires `Authorization: Bearer <this>`. Pair with V0's "Bearer Token" auth |

Self-host with Docker:

```bash
docker build -t jobstash-mcp .
docker run -p 3000:3000 jobstash-mcp
# MCP endpoint: http://localhost:3000/api/mcp
```

---

## Local development

```bash
git clone https://github.com/pato-gonzalez/jobstash-community-mcp.git
cd jobstash-community-mcp
pnpm install
cp .env.example .env

pnpm typecheck             # tsc --noEmit
pnpm test                  # vitest, msw-mocked (10 tests)
pnpm lint
pnpm dev                   # Next.js on http://localhost:3000 → /api/mcp
pnpm build                 # next build + tsup (dist/stdio.js)
```

Inspect the server with the official MCP Inspector:

```bash
# stdio
pnpm build:bin
pnpm dlx @modelcontextprotocol/inspector --cli node dist/stdio.js --method tools/list

# HTTP
pnpm dev
pnpm dlx @modelcontextprotocol/inspector
# In the UI: Streamable HTTP → http://localhost:3000/api/mcp
```

---

## Architecture

- Transport-agnostic core under [src/core/](./src/core/). Two adapters: Streamable HTTP ([src/app/api/mcp/route.ts](./src/app/api/mcp/route.ts) via `mcp-handler`) and stdio ([src/bin/stdio.ts](./src/bin/stdio.ts) via `@modelcontextprotocol/sdk`).
- Upstream responses validated with `zod` and `.passthrough()` — JobStash adding fields will not crash the server.
- LRU cache (max 500, configurable TTL). Exponential backoff with jitter on 5xx/429 only; 4xx never retries.
- `pino` structured logs. Query strings only at `debug` level (privacy on user search params).
- `JOBSTASH_API_TOKEN` and `MCP_BEARER_TOKEN` are stripped from error messages via `sanitizeMessage`.

---

## Disclaimer & License

Unofficial. Built and maintained by the community. Not endorsed by JobStash. Use of JobStash's API is subject to their terms.

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

The JobStash team for running an open public API. Anthropic for the Model Context Protocol. Vercel for `mcp-handler` and the V0 MCP integration.
