/**
 * Prompts API Route
 * GET /api/prompts - Get all prompts (with pagination and anti-scraping)
 * POST /api/prompts - Create a new prompt (requires authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { promptRepository } from '@/repositories';
import {
  successResponse,
  badRequestResponse,
  validateBody,
  handleApiRoute,
  createPromptSchema,
} from '@/lib/api-utils';
import { checkDuplicate } from '@/lib/duplicate-checker';
import { requireAuth } from '@/lib/security';
import { applyApiProtection, addProtectionHeaders } from '@/lib/anti-scraping';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// Maximum page size to prevent bulk extraction
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

// GET all prompts with anti-scraping protection
export async function GET(request: NextRequest) {
  // Apply anti-scraping protection
  const protection = applyApiProtection(request, 'prompts');
  if (!protection.allowed && protection.response) {
    return addProtectionHeaders(protection.response);
  }

  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const requestedSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
    const pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);
    
    // Parse missing type filter (for admin use)
    const missingType = searchParams.get('missingType') || undefined;
    
    // Check if pagination is requested (for backwards compatibility)
    const usePagination = searchParams.has('page') || searchParams.has('pageSize');
    
    if (usePagination) {
      // Return paginated results with optional missing type filter
      const result = missingType 
        ? await promptRepository.findPaginatedWithMissingFilter({ page, pageSize }, missingType)
        : await promptRepository.findAllPaginated(page, pageSize);
      
      const { data: prompts, total, totalPages } = result;
      
      const response = NextResponse.json({
        success: true,
        data: prompts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
      
      return addProtectionHeaders(response);
    }
    
    // For backwards compatibility, return all prompts (but log a warning)
    // Consider deprecating this in the future
    const prompts = await promptRepository.findAll();
    const response = successResponse(prompts);
    return addProtectionHeaders(response);
  });
}

// POST create new prompt (requires authentication)
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const validation = await validateBody(request, createPromptSchema);

    if ('error' in validation) {
      return badRequestResponse(validation.error);
    }

    const { data } = validation;

    // Validation - only effect and prompt are required
    if (!data.effect || !data.prompt) {
      return badRequestResponse('Missing required fields (effect, prompt)');
    }

    // Prepare the prompt input
    const promptInput = {
      effect: data.effect,
      description: data.description || '',
      tags: data.tags || [],
      modelTags: data.modelTags,
      prompt: data.prompt,
      source: data.source || 'unknown',
      imageUrl: data.imageUrl,
      category: data.category,
    };

    // Check for duplicates before creating
    const duplicateCheck = await checkDuplicate(promptInput);
    
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: duplicateCheck.message || '检测到重复提示词',
          duplicateType: duplicateCheck.duplicateType,
          existingPromptId: duplicateCheck.existingPromptId,
          existingPromptEffect: duplicateCheck.existingPromptEffect,
          similarityScore: duplicateCheck.similarityScore,
        },
        { status: 409 } // Conflict status code
      );
    }

    const newPrompt = await promptRepository.create(promptInput);

    return successResponse(newPrompt, 201);
  });
}
