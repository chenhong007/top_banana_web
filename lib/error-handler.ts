/**
 * Error Handler Utility
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '操作失败，请稍后重试';
}

/**
 * Log error (can be extended to send to error tracking service)
 */
export function logError(error: unknown, context?: string) {
  const errorMessage = formatErrorMessage(error);
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}]${context ? ` [${context}]` : ''} Error:`, errorMessage);
  
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  
  // TODO: Send to error tracking service (Sentry, etc.)
}

/**
 * Handle async operation with error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    logError(error, errorContext);
    return { error: errorMessage };
  }
}

