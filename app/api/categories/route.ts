/**
 * Categories API Route
 * GET /api/categories - Get all categories
 */

import { categoryRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all categories
export async function GET() {
  return handleApiRoute(async () => {
    const categories = await categoryRepository.findAll();
    return successResponse(categories);
  });
}
