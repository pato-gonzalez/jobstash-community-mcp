import type { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text: string;
  [k: string]: unknown;
}

export interface ResourceResult {
  contents: ResourceContent[];
  _meta?: { [k: string]: unknown };
  [k: string]: unknown;
}

export type ReadResourceFn = (uri: URL) => ResourceResult | Promise<ResourceResult>;
export type ReadResourceTemplateFn = (
  uri: URL,
  variables: Record<string, string | string[]>,
) => ResourceResult | Promise<ResourceResult>;

export interface ResourceHost {
  resource(name: string, uri: string, read: ReadResourceFn): unknown;
  resource(name: string, template: ResourceTemplate, read: ReadResourceTemplateFn): unknown;
}
