/**
 * Prompts API Route
 * GET /api/prompts - Get all prompts
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

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all prompts
export async function GET() {
  return handleApiRoute(async () => {
    const prompts = await promptRepository.findAll();
    return successResponse(prompts);
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
