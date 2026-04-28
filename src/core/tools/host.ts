import type { z } from 'zod';

export type ZodShape = Record<string, z.ZodTypeAny>;

export type ToolArgs<T extends ZodShape> = { [K in keyof T]: z.infer<T[K]> };

export interface ToolResultContent {
  type: 'text';
  text: string;
  [k: string]: unknown;
}

export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
  [k: string]: unknown;
}

// Minimal surface common to mcp-handler's `createMcpHandler` callback param
// and `@modelcontextprotocol/sdk`'s `McpServer`. Both expose a `tool` method
// with the same signature, which lets us register identical tool definitions
// for both transports.
export interface ToolHost {
  tool<T extends ZodShape>(
    name: string,
    description: string,
    schema: T,
    handler: (args: ToolArgs<T>) => ToolResult | Promise<ToolResult>,
  ): unknown;
}
