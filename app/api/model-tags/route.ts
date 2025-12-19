/**
 * Model Tags API Route
 * GET /api/model-tags - Get all AI model tags
 */

import { modelTagRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';

// GET all model tags
export async function GET() {
  return handleApiRoute(async () => {
    const modelTags = await modelTagRepository.findAll();
    return successResponse(modelTags);
  });
}
