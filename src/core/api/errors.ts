import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { sanitizeMessage } from '../utils/sanitize.js';

export class JobstashHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = 'JobstashHttpError';
  }
}

export class JobstashTimeoutError extends Error {
  constructor(
    public readonly url: string,
    public readonly timeoutMs: number,
  ) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'JobstashTimeoutError';
  }
}

export class JobstashNetworkError extends Error {
  constructor(
    public readonly url: string,
    cause: unknown,
  ) {
    super(`Network error contacting ${url}`);
    this.name = 'JobstashNetworkError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export class JobstashValidationError extends Error {
  constructor(
    public readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = 'JobstashValidationError';
  }
}

export function toMcpError(err: unknown): McpError {
  if (err instanceof McpError) return err;

  if (err instanceof JobstashTimeoutError) {
    return new McpError(ErrorCode.RequestTimeout, sanitizeMessage(err.message));
  }

  if (err instanceof JobstashNetworkError) {
    return new McpError(ErrorCode.ConnectionClosed, sanitizeMessage(err.message));
  }

  if (err instanceof JobstashHttpError) {
    if (err.status === 400 || err.status === 422) {
      return new McpError(
        ErrorCode.InvalidParams,
        sanitizeMessage(`JobStash rejected the request: ${err.message}`),
      );
    }
    if (err.status === 401 || err.status === 403) {
      return new McpError(
        ErrorCode.InvalidRequest,
        'JobStash request was unauthorized (this endpoint may require a paid bearer token).',
      );
    }
    if (err.status === 404) {
      return new McpError(ErrorCode.InvalidParams, 'Resource not found on JobStash.');
    }
    if (err.status === 429) {
      return new McpError(
        ErrorCode.InternalError,
        'JobStash rate-limited the request. Retry after a short delay.',
      );
    }
    return new McpError(
      ErrorCode.InternalError,
      sanitizeMessage(`JobStash returned ${err.status}: ${err.message}`),
    );
  }

  if (err instanceof JobstashValidationError) {
    return new McpError(
      ErrorCode.InternalError,
      'JobStash response did not match the expected schema. Try again or report a bug.',
    );
  }

  if (err instanceof Error) {
    return new McpError(ErrorCode.InternalError, sanitizeMessage(err.message));
  }

  return new McpError(ErrorCode.InternalError, 'Unknown error');
}
