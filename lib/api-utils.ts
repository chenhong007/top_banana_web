/**
 * API Utilities
 * Provides unified response handling and error management for API routes
 */

import { NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import type { ApiResponse, CreatePromptInput, UpdatePromptInput } from '@/types';

// Re-export types for backward compatibility
export type { ApiResponse, CreatePromptInput, UpdatePromptInput };

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Create an error API response
 */
export function errorResponse(error: string, status = 500): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(message = 'Resource not found'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 404);
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 400);
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 401);
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 403);
}

/**
 * Format Zod validation errors
 */
function formatZodError(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const errors: string[] = [];
  
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && Array.isArray(messages) && messages.length > 0) {
      errors.push(`${field}: ${messages.join(', ')}`);
    }
  }
  
  return errors.length > 0 ? errors.join('; ') : 'Validation failed';
}

/**
 * Validate request body with Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: string }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: `Validation error: ${formatZodError(error)}` };
    }
    if (error instanceof SyntaxError) {
      return { error: 'Invalid JSON in request body' };
    }
    return { error: 'Failed to parse request body' };
  }
}

/**
 * Higher-order function to wrap API handlers with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): () => Promise<NextResponse<ApiResponse<T | never>>> {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes('not found')) {
          return notFoundResponse(error.message);
        }
        if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
          return unauthorizedResponse(error.message);
        }
        return errorResponse(error.message, 500);
      }

      return errorResponse('An unexpected error occurred', 500);
    }
  };
}

/**
 * Async wrapper for API route handlers with automatic error handling
 */
export async function handleApiRoute<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T | never>>> {
  try {
    return await handler();
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }

    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * Common Zod schemas for reuse
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),

  // Non-empty string
  nonEmptyString: z.string().min(1, 'This field is required'),

  // Optional URL
  optionalUrl: z.string().url().optional().or(z.literal('')),

  // Pagination params
  pagination: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  }),
};

/**
 * Prompt creation schema
 */
export const createPromptSchema = z.object({
  effect: z.string().min(1, 'Effect/title is required'),
  description: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  modelTags: z.array(z.string()).optional(),
  prompt: z.string().min(1, 'Prompt content is required'),
  source: z.string().optional().default('unknown'),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  category: z.string().optional(),
});

/**
 * Prompt update schema (all fields optional)
 */
export const updatePromptSchema = createPromptSchema.partial();

/**
 * Import data schema
 */
export const importDataSchema = z.object({
  data: z.array(
    z.object({
      effect: z.string().min(1),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      modelTags: z.array(z.string()).optional(),
      prompt: z.string().min(1),
      source: z.string().optional(),
      imageUrl: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
  ),
  mode: z.enum(['merge', 'replace']).optional().default('merge'),
});

export type ImportDataInput = z.infer<typeof importDataSchema>;
