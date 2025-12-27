/**
 * Categories API Route
 * GET /api/categories - Get all categories
 */

import { NextRequest } from 'next/server';
import { categoryRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';
import { applyApiProtection, addProtectionHeaders } from '@/lib/anti-scraping';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all categories with anti-scraping protection
export async function GET(request: NextRequest) {
  // Apply anti-scraping protection
  const protection = applyApiProtection(request, 'categories');
  if (!protection.allowed && protection.response) {
    return addProtectionHeaders(protection.response);
  }

  return handleApiRoute(async () => {
    const categories = await categoryRepository.findAll();
    const response = successResponse(categories);
    return addProtectionHeaders(response);
  });
}
