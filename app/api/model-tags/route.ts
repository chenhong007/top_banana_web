/**
 * Model Tags API Route
 * GET /api/model-tags - Get all AI model tags
 */

import { modelTagRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';

// GET all model tags
export async function GET() {
  return handleApiRoute(async () => {
    // 返回完整的模型标签信息，包括 id、name、color、type 等
    const modelTags = await modelTagRepository.findAllWithDetails();
    return successResponse(modelTags);
  });
}
