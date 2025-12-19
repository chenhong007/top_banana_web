/**
 * Categories API Route
 * GET /api/categories - Get all categories
 */

import { categoryRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';

// GET all categories
export async function GET() {
  return handleApiRoute(async () => {
    const categories = await categoryRepository.findAll();
    return successResponse(categories);
  });
}
