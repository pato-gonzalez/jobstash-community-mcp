import type { z } from 'zod';

export type PromptArgsShape = Record<string, z.ZodTypeAny>;

export interface PromptMessageContent {
  type: 'text';
  text: string;
  [k: string]: unknown;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptMessageContent;
  [k: string]: unknown;
}

export interface PromptResult {
  messages: PromptMessage[];
  _meta?: { [k: string]: unknown };
  [k: string]: unknown;
}

export interface PromptHost {
  prompt<T extends PromptArgsShape>(
    name: string,
    description: string,
    schema: T,
    handler: (args: { [K in keyof T]: z.infer<T[K]> }) => PromptResult | Promise<PromptResult>,
  ): unknown;
}
