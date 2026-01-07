/**
 * Error handling utilities
 * Transform Zotero API errors into user-friendly messages
 */

export interface ErrorDetail {
  statusCode?: number;
  message: string;
  isRetryable: boolean;
  userMessage: string;
}

/**
 * Transform errors into user-friendly messages
 */
export function handleError(error: any): ErrorDetail {
  // Default error detail
  const detail: ErrorDetail = {
    message: error.message || 'Unknown error',
    isRetryable: false,
    userMessage: 'An unexpected error occurred',
  };

  // Extract status code from different error formats
  const statusCode =
    error.statusCode ||
    error.response?.status ||
    error.status ||
    (error.message?.match(/(\d{3})/)?.[1] ? parseInt(error.message.match(/(\d{3})/)[1]) : undefined);

  if (statusCode) {
    detail.statusCode = statusCode;
  }

  // Handle specific HTTP status codes
  if (statusCode === 400) {
    detail.userMessage = `Invalid request parameters: ${extractErrorMessage(error)}`;
    detail.isRetryable = false;
  } else if (statusCode === 401 || statusCode === 403) {
    detail.userMessage =
      'Authentication failed. Please check your ZOTERO_API_KEY in the .env file. ' +
      'Get your API key from: https://www.zotero.org/settings/keys';
    detail.isRetryable = false;
  } else if (statusCode === 404) {
    detail.userMessage = 'Item, collection, or resource not found. Please check the key or identifier.';
    detail.isRetryable = false;
  } else if (statusCode === 409) {
    detail.userMessage =
      'Version conflict. The item was modified by another client. Please fetch the latest version and try again.';
    detail.isRetryable = false;
  } else if (statusCode === 412) {
    detail.userMessage = 'Precondition failed. The library version has changed. Please retry your request.';
    detail.isRetryable = true;
  } else if (statusCode === 413) {
    detail.userMessage = 'Request entity too large. Try reducing the batch size or file size.';
    detail.isRetryable = false;
  } else if (statusCode === 429) {
    detail.userMessage = 'Rate limit exceeded. The server will automatically retry with exponential backoff.';
    detail.isRetryable = true;
  } else if (statusCode && statusCode >= 500) {
    detail.userMessage = 'Zotero server error. The request will be automatically retried.';
    detail.isRetryable = true;
  }

  // Handle network errors
  if (error.message?.includes('ECONNREFUSED')) {
    detail.userMessage = 'Could not connect to Zotero API. Please check your internet connection.';
    detail.isRetryable = true;
  } else if (error.message?.includes('ETIMEDOUT')) {
    detail.userMessage = 'Request timed out. Please check your internet connection and try again.';
    detail.isRetryable = true;
  } else if (error.message?.includes('ENOTFOUND')) {
    detail.userMessage = 'Could not resolve Zotero API hostname. Please check your internet connection.';
    detail.isRetryable = true;
  }

  // Handle validation errors (Zod)
  if (error.name === 'ZodError') {
    const issues = error.issues?.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    detail.userMessage = `Validation error: ${issues || error.message}`;
    detail.isRetryable = false;
  }

  return detail;
}

/**
 * Extract detailed error message from error object
 */
function extractErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data) return JSON.stringify(error.response.data);
  return 'Unknown error';
}

/**
 * Format error for MCP tool response
 */
export function formatErrorForMCP(error: any): string {
  const detail = handleError(error);

  let message = detail.userMessage;

  if (detail.statusCode) {
    message = `[Error ${detail.statusCode}] ${message}`;
  }

  // Add technical details for debugging (to stderr)
  console.error(`[Error Details] ${detail.message}`);

  return message;
}
