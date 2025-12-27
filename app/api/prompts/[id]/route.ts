/**
 * Single Prompt API Route
 * GET /api/prompts/[id] - Get a single prompt
 * PUT /api/prompts/[id] - Update a prompt (requires authentication)
 * DELETE /api/prompts/[id] - Delete a prompt (requires authentication)
 */

import { NextRequest } from 'next/server';
import { promptRepository } from '@/repositories';
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  validateBody,
  handleApiRoute,
  updatePromptSchema,
} from '@/lib/api-utils';
import { requireAuth } from '@/lib/security';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single prompt by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  return handleApiRoute(async () => {
    const { id } = await params;
    const prompt = await promptRepository.findById(id);

    if (!prompt) {
      return notFoundResponse('Prompt not found');
    }

    return successResponse(prompt);
  });
}

// PUT update prompt (requires authentication)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const { id } = await params;
    const validation = await validateBody(request, updatePromptSchema);

    if ('error' in validation) {
      return badRequestResponse(validation.error);
    }

    const updatedPrompt = await promptRepository.update(id, validation.data);

    if (!updatedPrompt) {
      return notFoundResponse('Prompt not found');
    }

    return successResponse(updatedPrompt);
  });
}

// DELETE prompt (requires authentication)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const { id } = await params;
    const deleted = await promptRepository.delete(id);

    if (!deleted) {
      return notFoundResponse('Prompt not found');
    }

    return successResponse({ id, deleted: true });
  });
}
