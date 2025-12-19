/**
 * Single Prompt API Route
 * GET /api/prompts/[id] - Get a single prompt
 * PUT /api/prompts/[id] - Update a prompt
 * DELETE /api/prompts/[id] - Delete a prompt
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

// PUT update prompt
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

// DELETE prompt
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return handleApiRoute(async () => {
    const { id } = await params;
    const deleted = await promptRepository.delete(id);

    if (!deleted) {
      return notFoundResponse('Prompt not found');
    }

    return successResponse({ id, deleted: true });
  });
}
