import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAll } from '../core/register.js';

const NAME = 'jobstash-mcp';
const VERSION = '0.1.0';

async function main(): Promise<void> {
  const server = new McpServer({ name: NAME, version: VERSION });
  registerAll(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  // stderr only — stdout is reserved for stdio MCP protocol traffic.
  console.error('jobstash-mcp stdio failed:', err);
  process.exit(1);
});
