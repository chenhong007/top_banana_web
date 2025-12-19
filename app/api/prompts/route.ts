/**
 * Prompts API Route
 * GET /api/prompts - Get all prompts
 * POST /api/prompts - Create a new prompt
 */

import { NextRequest } from 'next/server';
import { promptRepository } from '@/repositories';
import {
  successResponse,
  badRequestResponse,
  validateBody,
  handleApiRoute,
  createPromptSchema,
} from '@/lib/api-utils';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all prompts
export async function GET() {
  return handleApiRoute(async () => {
    const prompts = await promptRepository.findAll();
    return successResponse(prompts);
  });
}

// POST create new prompt
export async function POST(request: NextRequest) {
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

    const newPrompt = await promptRepository.create({
      effect: data.effect,
      description: data.description || '',
      tags: data.tags || [],
      modelTags: data.modelTags,
      prompt: data.prompt,
      source: data.source || 'unknown',
      imageUrl: data.imageUrl,
      category: data.category,
    });

    return successResponse(newPrompt, 201);
  });
}
