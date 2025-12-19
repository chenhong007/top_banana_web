/**
 * Tags API Route
 * GET /api/tags - Get all tags
 */

import { tagRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';

// GET all tags
export async function GET() {
  return handleApiRoute(async () => {
    const tags = await tagRepository.findAll();
    return successResponse(tags);
  });
}
