/**
 * Prompt Interactions API Route
 * POST /api/prompts/[id]/interactions - Increment likes or hearts
 */

import { NextRequest } from 'next/server';
import { promptRepository } from '@/repositories';
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  handleApiRoute,
} from '@/lib/api-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return handleApiRoute(async () => {
    const { id } = await params;
    const { type } = await request.json();

    if (!type || (type !== 'like' && type !== 'heart')) {
      return badRequestResponse('Invalid interaction type. Must be "like" or "heart".');
    }

    let updatedPrompt;
    if (type === 'like') {
      updatedPrompt = await promptRepository.incrementLikes(id);
    } else {
      updatedPrompt = await promptRepository.incrementHearts(id);
    }

    if (!updatedPrompt) {
      return notFoundResponse('Prompt not found');
    }

    return successResponse(updatedPrompt);
  });
}

