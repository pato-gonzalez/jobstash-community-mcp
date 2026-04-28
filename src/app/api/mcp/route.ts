import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { registerAll } from '@core/register.js';
import { loadConfig } from '@core/config.js';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const baseHandler = createMcpHandler(
  (server) => {
    registerAll(server);
  },
  {},
  { basePath: '/api' },
);

const config = loadConfig();
const requireAuth = config.MCP_BEARER_TOKEN.length > 0;

const verifyToken = async (
  _req: Request,
  bearer?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearer) return undefined;
  if (bearer !== config.MCP_BEARER_TOKEN) return undefined;
  return {
    token: bearer,
    scopes: ['jobstash:read'],
    clientId: 'jobstash-mcp-client',
  };
};

const handler = requireAuth
  ? withMcpAuth(baseHandler, verifyToken, {
      required: true,
      requiredScopes: ['jobstash:read'],
    })
  : baseHandler;

export { handler as GET, handler as POST, handler as DELETE };
